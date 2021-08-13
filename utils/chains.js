const chains = [{
  chainId: 1,
  chainName: 'Ethereum',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
  icon: require('~/assets/icons/chains/icon-ethereum.svg'),
}, {
  chainId: 137,
  chainName: 'Polygon POS',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  },
  rpcUrl: 'https://rpc-mainnet.maticvigil.com',
  icon: require('~/assets/icons/chains/icon-polygon.svg'),
}, {
  chainId: 56,
  chainName: 'Binance Smart Chain',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'BNB',
    decimals: 18
  },
  rpcUrl: 'https://bsc-dataseed.binance.org',
  icon: require('~/assets/icons/chains/icon-bsc.svg'),
}, {
  chainId: 128,
  chainName: 'Huobi ECO Chain',
  nativeCurrency: {
    name: 'HT',
    symbol: 'HT',
    decimals: 18
  },
  rpcUrl: 'https://http-mainnet-node.huobichain.com',
  icon: require('~/assets/icons/chains/icon-heco.svg'),
}, {
  forking: true,
  chainId: 71337,
  chainName: 'hardhat-dev.defirush.io',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrl: 'https://hardhat-dev.defirush.io',
}, {
  forking: true,
  chainId: 31337,
  chainName: 'localhost',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrl: 'http://localhost:8545',
}]


module.exports = {
  chains
}
