const _ = require('lodash')
const axios = require('axios')
const express = require('express')
const router = express.Router()

const error = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const CHAINS = require('./_chains.json')
const TOKENS = require('./_tokens.json')
const LOCALHOST_CHAIN_IDS = [31337]

router.get('/', async (req, res, next) => {
  let chainId = +req.query.chainId
  if (!chainId || LOCALHOST_CHAIN_IDS.indexOf(chainId) >= 0) {
    chainId = 1
  }
  const chain = _.find(CHAINS, { chainId })
  if (!chain) {
    throw error(400, 'Invalid chainId param')
  }
  const currency = _.find(TOKENS, (token) => token.symbol.toUpperCase() === chain.currencySymbol.toUpperCase())
  const results = [{
    'symbol': chain.currencySymbol,
    'name': currency.name,
    'logoURI': currency.logoURI,
    'address': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'decimals': 18,
  }]
  for (const token of TOKENS) {
    const contract = token.contract[chainId]
    if (contract) {
      const { name, logoURI } = token
      const { symbol, address, decimals } = contract
      // symbol 从 contract 里面取, 更准确, 而且是大写的
      results.push({ symbol, name, logoURI, address, decimals })
    }
  }
  res.json(results)
})

module.exports = router
