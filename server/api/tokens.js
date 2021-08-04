const _ = require('lodash')
const axios = require('axios')
const express = require('express')
const router = express.Router()

const createError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const CHAINS = require('./_chains.json')
const TOKENS = require('./_tokens.json')
const LOCALHOST_CHAIN_IDS = [31337, 71337]

router.get('/', async (req, res, next) => {
  let chainId = +req.query.chain_id
  if (!chainId || LOCALHOST_CHAIN_IDS.indexOf(chainId) >= 0) {
    chainId = 1
  }
  const chain = _.find(CHAINS, { chainId })
  if (!chain) {
    next(createError(400, 'Invalid chainId param'))
  }
  const currency = _.find(TOKENS, (token) => token.symbol.toUpperCase() === chain.currencySymbol.toUpperCase())
  const results = [{
    'id': currency.coingeckoId,
    'symbol': chain.currencySymbol,
    'name': currency.name,
    'logoURI': currency.logoURI,
    'address': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'decimals': 18,
  }]
  for (const token of TOKENS) {
    const contract = token.contract[chainId]
    if (contract) {
      const { coingeckoId, name, logoURI } = token
      const { symbol, address, decimals } = contract
      // symbol 从 contract 里面取, 更准确, 而且是大写的
      results.push({
        id: coingeckoId,
        symbol, name, logoURI, address, decimals
      })
    }
  }
  res.json(results)
})

router.get('/:id/price', async (req, res, next) => {
  const coingeckoId = req.params.id
  const currency = req.query.currency || 'usd'
  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        'ids': coingeckoId,
        'vs_currencies': currency,
      }
    })
    const price = data[coingeckoId][currency].toString()
    res.json({
      [currency]: price
    })
  } catch(err) {
    next(createError(500, 'price provider returns error'))
  }
})

module.exports = router
