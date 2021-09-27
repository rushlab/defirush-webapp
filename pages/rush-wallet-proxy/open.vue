<template>
  <div class="proxy-wallet-open">
    <el-card shadow="naver">
      <el-form label-position="top" style="max-width: 800px;">
        <el-form-item label="Owner Address">
          <el-input :value="walletAddress" readonly></el-input>
        </el-form-item>
        <el-form-item label="Any transaction requires the confirmation of">
          <el-input-number :value="1" readonly disabled></el-input-number>
        </el-form-item>
        <el-form-item>
          <p class="hint-text">You're about to create a new Proxy Wallet and will have to confirm a transaction with your currently connected wallet. </p>
          <p class="hint-text">The creation will cost approximately 0.04071 Ether.</p>
          <p class="hint-text">The exact amount will be determined by your wallet.</p>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :disabled="!walletAddress" @click="handleClickSubmit" :loading="!!pending">Submit and Create</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { ethers } from 'ethers'
import { mapState } from 'vuex'

const proxyContractAddresses = {
  '31337': {
    factoryAddress: '0x9A7848b9E60C7619f162880c7CA5Cbca80998034',
    singletonAddress: '0x72ed6e892932c90cDF3c2FDC436d06db4aF23EEC'
  },
  '4': {
    factoryAddress: '0xD335BB310b4D4585561a9A5D50D5700FcA3cc960',
    singletonAddress: '0x4002107488bFA0376890d0edbC52806572007272'
  }
}
export default {
  layout: 'rushwallet',
  data() {
    return {
      pending: false,
    }
  },
  computed: {
    ...mapState('auth', ['chainId', 'walletAddress', 'isAuthenticated', 'signerProtocol']),
  },
  methods: {
    handleClickSubmit() {
      this.$confirm('您正在为当前链接的钱包账户创建合约钱包账户，确定继续吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.createProxy()
      }).catch(() => {})
    },
    async createProxy() {
      try {
        this.pending = true
        const { factoryAddress, singletonAddress } = proxyContractAddresses[this.chainId] || {}
        const _factoryAddress = factoryAddress
        const _singletonAddress = singletonAddress
        const signer = this.$wallet.getSigner()
        const rushWalletInterface = new ethers.utils.Interface([
          'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)'
        ]);
        const initializerParams = [
          [this.$wallet.getAddress()],  // _owners
          ethers.BigNumber.from('1'),  // _threshold
          '0x0000000000000000000000000000000000000000',  // to
          '0x',  // data
          '0x0000000000000000000000000000000000000000',  // fallbackHandler
          '0x0000000000000000000000000000000000000000',  // paymentToken
          ethers.BigNumber.from('0'),  // payment
          '0x0000000000000000000000000000000000000000',  // paymentReceiver
        ]
        const initializer = rushWalletInterface.encodeFunctionData('setup', initializerParams)

        const factory = new ethers.Contract(_factoryAddress, [
          'event ProxyCreation(address proxy, address singleton)',
          'function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) returns (address proxy)'
        ], signer)
        // const saltNonce = '1';
        const saltNonce = (new Date()).valueOf().toString()
        const result = await factory.createProxyWithNonce(
          _singletonAddress, initializer, saltNonce
        ).then((tx) => tx.wait())
        // 初始化 contract 的时候, ABI 里放了 ProxyCreation, 会被提前解析
        const proxyCreationEvent = result.events.find((event) => event.event === 'ProxyCreation');
        const proxyAddress = proxyCreationEvent.args.proxy
        this.$router.push(`/rush-wallet-proxy/proxies/${proxyAddress}`)
      } catch (error) {
        console.log(error)
      }
      this.pending = false
    }
  },
}
</script>

<style lang="scss" scoped>
.hint-text {
  line-height: 22px;
  opacity: 0.8;
  font-weight: 200;
}
</style>
