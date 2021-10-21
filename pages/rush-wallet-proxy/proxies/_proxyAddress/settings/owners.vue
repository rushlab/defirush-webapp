<template>
  <div class="owners">
    <el-card shadow="naver">
      <div class="clearfix">
        <el-button class="pull-right" type="text" @click="addOwner"><i class="el-icon-plus"></i> Add Owner</el-button>
      </div>
      <el-table 
        :data="ownersTable.data"
        v-loading="!!ownersTable.pending"
        element-loading-spinner="el-icon-loading"
        class="no-bottom-border"
      >
        <!-- <el-table-column label="ADDRESS" prop="name">
          <template slot-scope="{ row }">
            <el-image class="bank-image" fit="contain" :src="row.logo"></el-image>
          </template>
        </el-table-column> -->
        <el-table-column label="ADDRESS">
          <template slot-scope="{ row }">
            <div>
              <span>{{ row.address }}</span>
              <el-tooltip class="item" effect="dark" content="Click to copy" placement="top">
                <a href="javascript: void(0);" @click="() => copyToClipboard(row.address)"><i class="el-icon-copy-document" ></i></a>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column width="240px">
          <!-- <el-tooltip effect="dark" content="Edit owner" placement="top">
            <a class="row-action" href="javascript: void(0);" @click="() => editOwner(row)"><i class="el-icon-edit" ></i></a>
          </el-tooltip> -->
          <template slot-scope="{ row }">
            <el-tooltip effect="dark" content="Replace owner" placement="top">
              <el-button type="text" class="row-action" :disabled="!proxyInstance" @click="() => replaceOwner(row)">
                <i class="el-icon-refresh"></i>
              </el-button>
            </el-tooltip>
            <el-tooltip effect="dark" content="Remove owner" placement="top">
              <el-button type="text" class="row-action" :disabled="!proxyInstance || ownersLength <= 1" @click="() => removeOwner(row)">
                <i class="el-icon-delete"></i>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <add-owner-dialog 
      v-if="addOwnerDialogVisible"
      :visible.sync="addOwnerDialogVisible"
      :proxy-instance="proxyInstance"
      :proxy-address="proxyAddress"
      @success="onAddOwnerSuccess"
    />
    <remove-owner-dialog 
      v-if="removeOwnerDialogVisible"
      :visible.sync="removeOwnerDialogVisible"
      :proxy-instance="proxyInstance"
      :owner-address="selectedOwnerAddress"
      @success="onRemoveOwnerSuccess"
    />

    <replace-owner-dialog 
      v-if="replaceOwnerDialogVisible"
      :visible.sync="replaceOwnerDialogVisible"
      :proxy-instance="proxyInstance"
      :old-owner="selectedOwnerAddress"
      @success="onReplaceOwnerSuccess"
    />
  </div>
</template>

<script>
import { ethers } from 'ethers'
import { mapState } from 'vuex'
import { copyToClipboard } from '@/utils/copy'
import ReplaceOwnerDialog from '@/components/rush-wallet-proxy/dialogs/ReplaceOwnerDialog'
import AddOwnerDialog from '@/components/rush-wallet-proxy/dialogs/AddOwnerDialog'
import RemoveOwnerDialog from '@/components/rush-wallet-proxy/dialogs/RemoveOwnerDialog'


export default {
  layout: 'rushwallet',
  components: {
    ReplaceOwnerDialog,
    AddOwnerDialog,
    RemoveOwnerDialog,
  },
  head() {
    return {
      title: 'Owners'
    }
  },
  data() {
    return {
      proxyAddress: null,
      ownersTable: {
        pending: false,
        data: []
      },
      proxyInstance: null,
      pending: false,

      selectedOwnerAddress: null,

      addOwnerDialogVisible: false,
      replaceOwnerDialogVisible: false,
      removeOwnerDialogVisible: false,
    }
  },
  computed: {
    ...mapState('auth', ['chainId', 'walletAddress']),
    ownersLength() {
      return this.ownersTable.data.length
    }
  },
  mounted() {
    this.proxyAddress = this.$route.params.proxyAddress
    this.initContract()
    this.getOwners()
  },
  methods: {
    copyToClipboard,
    initContract() {
      const abi = [
        "function swapOwner(address prevOwner, address oldOwner, address newOwner) public",
        "function addOwnerWithThreshold(address owner, uint256 _threshold) public",
        "function removeOwner(address prevOwner, address owner, uint256 _threshold) public",
        "function getOwners() public view returns (address[] memory)",
        "function getThreshold() public view returns (uint256)",
        "function isOwner(address owner) public view returns (bool)",
        "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)"
      ]
      const signer = this.$wallet.getSigner()
      this.proxyInstance = new ethers.Contract(this.proxyAddress, abi, signer)
    },
    async getOwners() {
      this.ownersTable.pending = true
      try {
        const owners = await this.proxyInstance.getOwners()
        this.ownersTable.data = owners.map(address => {
          return { address }
        })
      } catch (error) {
        console.log('getOwners failed', JSON.stringify(error))
      }
      this.ownersTable.pending = false
    },
    handleClickSubmit() {
      this.$confirm('You are creating an contract wallet of Rush, click OK to continue', 'Notice', {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        type: 'warning'
      }).then(() => {
      }).catch(() => {})
    },
    onDialogOpen() {},
    onDialogClose() {},
    editOwner(ownerItem) {
      // TODO 需要中心化服务器支持
    },
    addOwner() {
      this.addOwnerDialogVisible = true
    },
    removeOwner(ownerItem = {}) {
      const { address } = ownerItem
      if (!address) return
      this.selectedOwnerAddress = address
      this.removeOwnerDialogVisible = true
    },
    replaceOwner(ownerItem) {
      const { address } = ownerItem
      if (!address) return
      this.selectedOwnerAddress = address
      this.replaceOwnerDialogVisible = true
    },
    onReplaceOwnerSuccess() {
      this.selectedOwnerAddress = null
      this.getOwners()
    },
    onAddOwnerSuccess() {
      this.getOwners()
    },
    onRemoveOwnerSuccess() {
      this.selectedOwnerAddress = null
      this.getOwners()
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
.row-action {
  margin: 0 5px;
  opacity: 0.5;
  &:hover {
    opacity: 1;
  }
}
.btn--remove-owner {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
}
</style>
