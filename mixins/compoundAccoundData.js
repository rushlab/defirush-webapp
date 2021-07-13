import _ from 'lodash'
import { ethers } from "ethers"
import {
  Address_cEther, Address_cToken, Address_comptroller,
  ABI_cToken, ABI_cEther, ABI_comptroller,
} from '@/constants/contracts/compound'


export default () => {
  return {
    data() {
      return {
        totalBorrows: null,     // 已借贷额度
        availableCredit: null,  // 总的可借贷额度
        liquidity: null,        // 当前可借贷额度
      }
    },
    computed: {
      healthFactor() {
        // liquidity / totalBorrows
        const totalBorrows = this.totalBorrows || ethers.constants.Zero
        const liquidity = this.liquidity || ethers.constants.Zero
        if (totalBorrows.isZero()) {
          return ' - '
        }
        console.log(1234, totalBorrows.toString(), liquidity.toString(), liquidity.mul(100).div(totalBorrows).toString())
        return liquidity.mul(100).div(totalBorrows).toString()
      }
    },
    methods: {
      getComptrollerContract() {
        const compTroller = new ethers.Contract(Address_comptroller, ABI_comptroller, this.provider)
        return compTroller
      },
      getPriceFeed() {
        const priceFeed = new ethers.Contract(
          '0x841616a5CBA946CF415Efe8a326A621A794D0f97',
          [
            'function price(string memory symbol) external view returns (uint)',
            'function getUnderlyingPrice(address cToken) external view returns (uint)'
          ],
          this.provider
        )
        return priceFeed
      },
      formatBalance(value) {
        return value ? ethers.utils.formatUnits(value) : '0.00'
      },
      async getAccoundData() {
        const signer = this.provider.getSigner()
        const msgSender = await signer.getAddress()

        const compTroller = this.getComptrollerContract()
        const priceFeed = this.getPriceFeed()

        const _1e18 = ethers.utils.parseUnits('1', 18)
        const [,liquidity,] = await compTroller.getAccountLiquidity(msgSender)
        let totalBorrows = ethers.constants.Zero
        // cTokens: 用户 enterMarkets 的资产
        const cTokens = await compTroller.getAssetsIn(msgSender)
        const _promises = cTokens.map(async (cTokenAddress) => {
          const cToken = new ethers.Contract(cTokenAddress, ABI_cToken, this.provider)
          const borrowBalance = await cToken.borrowBalanceStored(msgSender)
          const underlyingPrice = await priceFeed.getUnderlyingPrice(cTokenAddress)
          const borrowValue = borrowBalance.mul(underlyingPrice).div(_1e18)  // usd value * 1e18
          totalBorrows = totalBorrows.add(borrowValue)
        });
        await Promise.all(_promises)
        const availableCredit = totalBorrows.add(liquidity)
        this.availableCredit = availableCredit
        this.liquidity = liquidity
        this.totalBorrows = totalBorrows
      }
    },
  }
}