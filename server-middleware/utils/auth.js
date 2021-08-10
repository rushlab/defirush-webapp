const { ethers } = require('ethers')
const LeanCloudStorage = require('leancloud-storage')
const { getSecret } = require('./index')

// -MdYXbMMI 结尾的就不是 CN region, 不需要提供 serverURL
const LEANCLOUD_APPID = getSecret('LEANCLOUD_APPID', '000-MdYXbMMI')
const LEANCLOUD_APPKEY = getSecret('LEANCLOUD_APPKEY', '0')

LeanCloudStorage.init({ appId: LEANCLOUD_APPID, appKey: LEANCLOUD_APPKEY })

const getOrCreateUserProfile = async (walletChainId, walletAddress) => {
  const telegramKey = 'T' + ethers.utils.id(`${(new Date().valueOf())}${walletAddress}`).substr(2, 16).toUpperCase()
  let profile
  try {
    const query = new LeanCloudStorage.Query('UserProfile')
    query.equalTo('walletChainId', walletChainId)
    query.equalTo('walletAddress', walletAddress)
    profile = await query.first()
  } catch(err) {}
  if (!profile) {
    const UserProfile = LeanCloudStorage.Object.extend('UserProfile')
    profile = new UserProfile()
    profile.set('walletChainId', walletChainId)
    profile.set('walletAddress', walletAddress)
    profile.set('telegramKey', telegramKey)
    await profile.save()
  } else if (!profile.get('telegramKey')) {
    profile.set('telegramKey', telegramKey)
    await profile.save()
  }
  return profile
}

const validateSignature = async ({ chainId, address, message, signature }) => {
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
}

const authenticate = async (req) => {
  let customer = {
    isAuthenticated: false
  }
  if (/Web3WalletAuth [^ ]+/i.test(req.headers.authorization || '')) {
    const authToken = req.headers.authorization.split(' ')[1]
    try {
      const content = Buffer.from(authToken, 'base64').toString()
      const { chainId, address, message, signature } = JSON.parse(content)
      await validateSignature({ chainId, address, message, signature })
      const [walletChainId, walletAddress] = [chainId, address]
      const userProfile = await getOrCreateUserProfile(walletChainId, walletAddress)
      customer = {
        walletChainId,
        walletAddress,
        profile: userProfile.toJSON(),
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
