<template>
  <div class="proxy-wallet-open">
    <el-card shadow="naver">
      <el-form label-position="top" style="max-width: 800px;">
        <el-form-item label="Owner Address">
          <div class="owner-item">
            <el-input :value="walletAddress" readonly></el-input>
          </div>
          <div 
            class="owner-item"
            v-for="(ownerItem, index) in otherOwners"
            :key="`owner-item-${index}`"
          >
            <el-input v-model="ownerItem.address"></el-input>
            <el-button class="btn--remove-owner" type="danger" size="small" circle plain @click="() => removeOwner(index)">
              <i class="el-icon-delete"></i>
            </el-button>
          </div>
          <div class="text-center">
            <el-button type="text" @click="addOwner">Add Owner</el-button>
          </div>
        </el-form-item>
        <el-form-item label="Any transaction requires the confirmation of">
          <el-input-number v-model="threshold" :min="1" :max="validOwnersLength" :step="1" step-strictly></el-input-number> out of {{ validOwnersLength }} owner(s)
        </el-form-item>
        <el-form-item>
          <p class="hint-text">You're about to create a new Proxy Wallet and will have to confirm a transaction with your currently connected wallet. </p>
          <p class="hint-text">The creation will cost approximately {{ estimatedGas }} gas.</p>
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
    factoryAddress: '0x322619fcCcc741880ee7071cBE4e877Fb919eCf8',
    singletonAddress: '0x62DB6c1678Ca81ea0d946EA3dd75b4F71421A2aE'
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
      otherOwners: [],
      threshold: 1,
      estimatedGas: 'NA'
    }
  },
  computed: {
    ...mapState('auth', ['chainId', 'walletAddress', 'isAuthenticated', 'signerProtocol']),
    validOtherOwners() {
      return this.otherOwners.filter(owner => !!owner.address)
    },
    validOtherOwnerAddresses() {
      return this.validOtherOwners.map(owner => owner.address)
    },
    validOwnersLength() {
      return this.validOtherOwners.length + 1
    }
  },
  watch: {
    otherOwners: {
      handler(val) {
        const thresholdMax = this.validOwnersLength
        if (this.threshold > thresholdMax) {
          this.threshold = thresholdMax
        } else {
          this.estimateGas()
        }
      },
      deep: true
    },
    threshold() {
      this.estimateGas()
    }
  },
  mounted() {
    this.estimateGas()
  },
  methods: {
    inputOwnerAddress(index, address) {
      this.$set(this.otherOwners, index, { address })
    },
    addOwner() {
      this.$set(this.otherOwners, this.otherOwners.length, { address: '' })
    },
    removeOwner(index) {
      this.otherOwners.splice(index, 1)
    },
    handleClickSubmit() {
      this.$confirm('You are creating an contract wallet of Rush, click OK to continue', 'Notice', {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(() => {
        this.createProxy()
      }).catch(() => {})
    },
    getCreationOptions() {
      const { factoryAddress, singletonAddress } = proxyContractAddresses[this.chainId] || {}
      const _factoryAddress = factoryAddress
      const _singletonAddress = singletonAddress
      const signer = this.$wallet.getSigner()
      const rushWalletInterface = new ethers.utils.Interface([
        'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)'
      ]);
      const initializerParams = [
        [this.$wallet.getAddress(), ...this.validOtherOwnerAddresses],  // _owners
        ethers.BigNumber.from(this.threshold.toString()),  // _threshold
        '0x0000000000000000000000000000000000000000',  // to
        '0x',  // data
        '0x0000000000000000000000000000000000000000',  // fallbackHandler
        '0x0000000000000000000000000000000000000000',  // paymentToken
        ethers.BigNumber.from('0'),  // payment
        '0x0000000000000000000000000000000000000000',  // paymentReceiver
      ]
      const initializer = rushWalletInterface.encodeFunctionData('setup', initializerParams)
      const saltNonce = (new Date()).valueOf().toString()
      const factory = new ethers.Contract(_factoryAddress, [
        'event ProxyCreation(address proxy, address singleton)',
        'function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) returns (address proxy)'
      ], signer)
      return {
        factory,
        params: [
          _singletonAddress, 
          initializer, 
          saltNonce
        ]
      }
    },
    async estimateGas() {
      try {
        // const saltNonce = '1';
        const { factory, params } = this.getCreationOptions()
        const res = await factory.estimateGas.createProxyWithNonce(...params)
        console.log('@@@ gas estimated is ', +res)
        this.estimatedGas = +res
      } catch (error) {
        console.log(error)
      }
    },
    async createProxy() {
      try {
        this.pending = true
        // const saltNonce = '1';
        const { factory, params } = this.getCreationOptions()
        const result = await factory.createProxyWithNonce(...params).then(this.$wallet.waitForTx)
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
.owner-item {
  position: relative;
  margin-bottom: 10px;
  padding-right: 40px;
}
.btn--remove-owner {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}
</style>
