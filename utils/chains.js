const chains = [{
  chainId: 1,
  chainName: 'Ethereum',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161']
}, {
  chainId: 137,
  chainName: 'Polygon POS',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  },
  rpcUrls: ['https://rpc-mainnet.maticvigil.com']
}, {
  chainId: 56,
  chainName: 'Binance Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrls: ['https://bsc-dataseed.binance.org']
}, {
  chainId: 128,
  chainName: 'Huobi ECO Chain',
  nativeCurrency: {
    name: 'HT',
    symbol: 'HT',
    decimals: 18
  },
  rpcUrls: ['https://http-mainnet-node.huobichain.com']
}, {
  forking: true,
  chainId: 71337,
  chainName: 'hardhat-dev.defirush.io',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://hardhat-dev.defirush.io']
}, {
  forking: true,
  chainId: 31337,
  chainName: 'localhost',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['http://localhost:8545']
}]


module.exports = {
  chains
}
