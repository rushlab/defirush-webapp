const { ethers } = require('ethers')

const authenticate = async (req) => {
  let customer = {
    isAuthenticated: false
  }
  if (/Web3WalletAuth [^ ]+/i.test(req.headers.authorization || '')) {
    const authToken = req.headers.authorization.split(' ')[1]
    try {
      const content = Buffer.from(authToken, 'base64').toString()
      const { chainId, address, message, signature } = JSON.parse(content)
      const [_tip, _address, _timestamp] = message.split('\n')
      if ((new Date()).valueOf() - _timestamp > 86400 * 7 * 1000) {
        throw new Error('expired')
      }
      if (_address.toLowerCase() !== address.toLowerCase()) {
        throw new Error('invalid address')
      }
      const signerAddress = await ethers.utils.verifyMessage(message, signature)
      if (signerAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error('invalid signature')
      }
      customer = {
        chainId,
        address,
        isAuthenticated: true,
      }
    } catch(err) {
      console.log(err)
    }
  }
  return customer
}

module.exports = {
  authenticate
}
