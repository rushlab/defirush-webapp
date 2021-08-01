const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const { ethers } = require('ethers')

const CHAINS = require('./_chains.json')
const CoinGeckoApi = axios.create({
  baseURL: 'https://api.coingecko.com/api/v3/'
})

async function save(tokens) {
  const content = JSON.stringify(tokens, null, 2)
  const jsonFilePath = path.join(__dirname, './_tokens.json')
  fs.writeFileSync(jsonFilePath, content + '\n', 'utf8')
}

async function fetchToken(token) {
  const res = await CoinGeckoApi.get(`/coins/${token.coingeckoId}`, {
    params: {
      'localization': 'false',
      'tickers': 'false',
      'market_data': 'false',
      'community_data': 'false',
      'developer_data': 'false',
      'sparkline': 'false',
    }
  })
  const { platforms } = res.data
  const contract = {}
  for (const chain of CHAINS) {
    const address = platforms[chain.coingeckoId]
    if (address) {
      const erc20 = new ethers.Contract(address, [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint256)',
      ], new ethers.providers.JsonRpcProvider(chain.rpcURL));
      const [symbol, decimals] = await Promise.all([
        erc20.symbol().catch(() => token.symbol),
        erc20.decimals().catch(() => 18),
      ])
      contract[chain.chainId] = {
        address,
        symbol,
        decimals: +decimals,
      }
    }
  }
  token.contract = contract
  return token
}

async function listMarkets() {
  const res1 = await CoinGeckoApi.get('/coins/markets', {
    params: {
      'vs_currency': 'usd',
      'per_page': 250,
      'order': 'market_cap_rank',
    }
  })
  const res2 = await CoinGeckoApi.get('/coins/markets', {
    params: {
      'vs_currency': 'usd',
      'ids': (_.map(CHAINS, (chain) => _.get(chain, 'wrappedCurrency.coingeckoId'))).join(',')
    }
  })
  const tokens = _.map([...res1.data, ...res2.data], (item) => {
    const { id, symbol, name, image } = item
    return {
      coingeckoId: id,
      symbol: symbol,
      name: name,
      logoURI: image
    }
  })
  await save(tokens)
  return tokens
}

async function run() {
  const tokens = await listMarkets()
  console.log(`${tokens.length} tokens fetched`)
  for (const token of tokens) {
    try {
      // 会直接修改 token 的内容
      await fetchToken(token)
      console.log(`Token ${token.symbol} fetched`)
      await save(tokens)
    } catch(error) {
      console.log(token.symbol, error)
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
