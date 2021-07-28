import Vue from 'vue'
import _ from 'lodash'
import { ethers } from 'ethers'
import { MessageBox, Notification } from 'element-ui'


/**
 * 管理全局的 transaction 状态, 比如
 *  await contract.method(args).then(this.$waitForTx)
 * 或者
 *  const tx = await contract.method(args)
 *  await this.$waitForTx(tx)
 */
Vue.prototype.$waitForTx = async function(tx) {
  const hash = tx.hash
  const notify = {
    dangerouslyUseHTMLString: true,
    message: `<a href="https://etherscan.io/tx/${hash}" target="_blank">${hash.substr(0, 20)}...</a>`,
    position: 'bottom-right',
    showClose: true,
    duration: 0,
  }
  const pending = Notification.warning({ ...notify, title: 'Transaction is pending' })
  try {
    await tx.wait()
    pending.close()
    Notification.success({
      ...notify,
      title: 'Transaction confirmed',
      duration: 10 * 1000
    })
  } catch(err) {
    pending.close()
    Notification.error({ ...notify, title: 'Transaction reverted' })
    // transaction 的错误会继续抛出, 但是页面上一般不需要做什么, 页面上处理合约执行的错误就行了
    throw err
  }
}
