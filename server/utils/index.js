const fs = require('fs')
const path = require('path')

const getSecret = (secretKey, defaultValue='') => {
  if (process.env[secretKey]) {
    return process.env[secretKey]
  }
  const SECRETS_FILE = path.join(__dirname, '../../.secrets.js')
  let secret = defaultValue
  if (fs.existsSync(SECRETS_FILE)) {
    const secrets = require(SECRETS_FILE)
    if (secrets[secretKey]) {
      secret = secrets[secretKey]
    }
  }
  return secret
}

module.exports = {
  getSecret
}
