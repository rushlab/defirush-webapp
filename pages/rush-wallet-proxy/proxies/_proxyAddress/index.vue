<template>
  <el-card>
    <el-table :data="tableData" v-loading="!!pending" element-loading-spinner="el-icon-loading">
      <el-table-column label="ASSET" prop="symbol"></el-table-column>
      <el-table-column label="BALANCE">
        <template slot-scope="{ row }">
          <div> {{ row.balance }} {{ row.symbol }}</div>
        </template>
      </el-table-column>
      <el-table-column label="ACTIONS" width="200">
        <template slot-scope="{ row }">
          <el-button
            size="small" type="primary"
            @click.stop="() => handleOpenDialogSend(row)">Send</el-button>
          <el-button
            size="small" type="warning"
            @click.stop="handleReceive">Receive</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- send dialog -->
    <el-dialog
      title="Send fouds"
      :visible.sync="dialogSend.isVisible"
      width="500px" top="10vh"
      :fullscreen="false"
      :append-to-body="true"
      :modal-append-to-body="true"
      @close="resetDialogSend"
    >
      <el-form :model="dialogSend" label-position="top">
        <el-form-item label="Asset">
          <el-input :value="dialogSend.assetData.symbol" readonly>
            <el-button slot="append" icon="el-icon-copy-document" @click="execCopy(dialogSend.assetData.address)"></el-button>
          </el-input>
          <div class="input__hints">Balance: {{ dialogSend.assetData.balance }}</div>
        </el-form-item>
        <el-form-item label="Recipient">
          <el-input v-model="dialogSend.formData.recipient" autocomplete="off"></el-input>
        </el-form-item>
        <el-form-item label="Amount">
          <el-input v-model="dialogSend.formData.amountDisplay" autocomplete="off">
            <div slot="append">{{ dialogSend.assetData.symbol }}</div>
          </el-input>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="resetDialogSend">取 消</el-button>
        <el-button type="primary" :disabled="disabledSend" @click="handleSend" :loading="pendingSend">确 定</el-button>
      </div>
    </el-dialog>
    <!-- end send dialog -->

    <!-- receive dialog -->
    <el-dialog
      title="Receive assets"
      :visible.sync="dialogReceive.isVisible"
      width="500px" top="10vh"
      :fullscreen="false"
      :append-to-body="true"
      :modal-append-to-body="true"
    >
      <div class="receive-dialog__body">
        <p>This is the address of your Proxy Wallet Address. Deposit funds by scanning the QR code or copying the address below. Only send Ether and assets to this address (e.g. ETH, ERC20, ERC721)!</p>
        <div class="qrcode-wrapper">
          <qrcode :value="proxyAddress" :options="{ width: 200 }"/>
        </div>
        <div class="proxy-address">{{ proxyAddress }} <a href="javascript:void(0);" @click="execCopy(proxyAddress)"><i class="el-icon-copy-document"></i></a></div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="dialogReceive.isVisible = false">确 定</el-button>
      </div>
    </el-dialog>
    <!-- end receive dialog -->

  </el-card>
</template>

<script>
import _ from 'lodash'
import { mapState } from 'vuex'
import { ethers } from "ethers"
import { copyToClipboard } from '@/utils/copy'
import VueQrcode from '@chenfengyuan/vue-qrcode'

const ERC20_TOKENS = [
  { symbol: 'ETH', address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', decimals: 18 },
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'USDT', address: '0xdac17f958d2ee523a2206206994597c13d831ec7', decimals: 6 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'DAI', address: '0x6b175474e89094c44da98b954eedeac495271d0f', decimals: 18 },
  { symbol: '1INCH', address: '0x111111111117dc0aa78b770fa6a738034120c302', decimals: 18 },
  { symbol: "UNI", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals: 18 }
]

const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address recipient, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]

const proxyABI = [
  'event ExecutionFailure(bytes32 txHash, uint256 payment)',
  'event ExecutionSuccess(bytes32 txHash, uint256 payment)',
  'function payETH(address to, uint256 amount)',
  'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
  'function requiredTxGas(address to, uint256 value, bytes calldata data, uint8 operation) external returns (uint256)',
  'function encodeTransactionData(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes memory)',
]


export default {
  components: {
    Qrcode: VueQrcode
  },
  data() {
    return {
      ERC20_TOKENS,
      customTokens: [],
      pending: false,
      pendingSend: false,
      tableData: [],
      dialogSend: {
        isVisible: false,
        assetData: {
          symbol: '',
          address: '',
          balance: '0.00',
        },
        formData: {
          recipient: '',
          amountDisplay: '0.00'
        }
      },
      dialogReceive: {
        isVisible: false,
      }
    }
  },
  computed: {
    walletTokens() {
      return [
        ...this.ERC20_TOKENS,
        ...this.customTokens
      ]
    },
    proxyAddress() {
      return this.$route.params.proxyAddress
    },
    disabledSend() {
      const {
        assetData,
        formData,
      } = this.dialogSend
      const { symbol, address, balance = '0.00', decimals } = assetData || {}
      const { recipient = '', amountDisplay = '0.00' } = formData || {}
      return !address || !+balance || !recipient || !+amountDisplay
    }
  },
  mounted() {
    this.fetchTableData()
  },
  methods: {
    execCopy(content) {
      copyToClipboard(content)
      this.$message({ type: 'success', message: 'Copied successfully!' })
    },
    async fetchTableData() {
      try {
        this.pending = true
        this.tableData = _.map(this.walletTokens, (token) => {
          const itemData = {
            ...token,
            balance: '0.00'
          }
          this.getBalance(token.address).then(value => {
            itemData.balance = value
          })
          return itemData
        })
      } catch (error) {

      }
      this.pending = false
    },
    async getBalance(asset) {
      const provider = this.$wallet.getProvider()
      const address = this.proxyAddress
      if (!asset || this.$wallet.isETH(asset)) {
        const balance = await provider.getBalance(address)
        return ethers.utils.formatEther(balance)
      } else {
        // 否则就认为 asset 是 erc20
        const erc20 = new ethers.Contract(asset, [
          'function balanceOf(address account) view returns (uint256)',
          'function decimals() view returns (uint256)',
        ], provider);
        const [balance, decimals] = await Promise.all([erc20.balanceOf(address), erc20.decimals()])
        return ethers.utils.formatUnits(balance, decimals)
      }
    },
    resetDialogSend() {
      this.dialogSend = {
        isVisible: false,
        assetData: {
          symbol: '',
          address: '',
          balance: '0.00',
        },
        formData: {
          recipient: '',
          amountDisplay: '0.00'
        }
      }
    },
    handleOpenDialogSend(assetData) {
      this.dialogSend = {
        isVisible: true,
        assetData: {
          symbol: '',
          address: '',
          balance: '0.00',
          ...assetData
        },
        formData: {
          recipient: '',
          amountDisplay: '0.00'
        }
      }
    },
    _displayToMantissa(amountDisplay, decimals) {
      const re = new RegExp(`(\\d+\\.\\d{${decimals}})(\\d+)`);
      const amountDisplayTruncated = amountDisplay.toString().replace(re, '$1');
      return ethers.utils.parseUnits(amountDisplayTruncated, decimals);
    },
    _getSendTransactionPayload() {
      const {
        assetData,
        formData,
      } = this.dialogSend
      const { symbol, address, balance = '0.00', decimals } = assetData || {}
      const { recipient = '', amountDisplay = '0.00' } = formData || {}

      if (!address || !+balance || !recipient || !+amountDisplay) {
        throw new Error('缺少参数')
      }
      const erc20Interface = new ethers.utils.Interface(ERC20_ABI)
      const amountMantissa = this._displayToMantissa(amountDisplay, decimals);
      const data = erc20Interface.encodeFunctionData('transfer', [
        recipient,
        amountMantissa // amount
      ])
      const result = {
        to: address,
        data
      }
      if (this.$wallet.isETH(address)) {
        result.to = recipient
        result.value = amountMantissa
      }
      return result
    },
    async handleSend() {
      try {
        this.pendingSend = true
        const userProxy = new ethers.Contract(this.proxyAddress, proxyABI, this.$wallet.getSigner())
        const { to, value = '0', data } = this._getSendTransactionPayload()
        // return
        const operation = '0'
        const safeTxGas = ethers.BigNumber.from('0')
        const baseGas = '0'
        const gasPrice = '0'
        const gasToken = '0x0000000000000000000000000000000000000000'
        const refundReceiver = '0x0000000000000000000000000000000000000000'
        const signatures = ethers.utils.arrayify('0x')

        const res = await userProxy.execTransaction(
          to, // to,
          value, // value,
          data, // data,
          operation, // operation,
          safeTxGas, // safeTxGas,
          baseGas, // baseGas,
          gasPrice, // gasPrice,
          gasToken, // gasToken,
          refundReceiver, // refundReceiver,
          signatures, // signatures,
        ).then(tx => tx.wait())
        this.resetDialogSend()
        this.fetchTableData()
      } catch (error) {
        this.$message.error(error.message || error.toString())
      }
      this.pendingSend = false
    },
    handleReceive() {
      console.log(12345)
      this.dialogReceive.isVisible = true
    },
  },
}
</script>

<style lang="scss" scoped>
.form-item__label {
  width: 100%;
}
.label-with-hint {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.input__hint {
  font-size: 16px;
  line-height: 1;
  margin-bottom: 10px;
}
.qrcode-wrapper {
  text-align: center;
  margin: 20px auto;
}
.proxy-address {
  text-align: center;
}
</style>
