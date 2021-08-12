module.exports = {
  addresses: {
    LendingPool: {
      default: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
      1: '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
      137: '0x8dff5e27ea6b7ac08ebfdf9eb090f32ee9a30fcf',
    },
    LendingPoolAddressesProvider: {
      default: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
      1: '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5',
      137: '0xd05e3E715d945B59290df0ae8eF85c1BdB684744',
    },
    ProtocolDataProvider: {
      default: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
      1: '0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d',
      137: '0x7551b5D2763519d4e37e8B81929D336De671d46d',
    },
    WETHGateway: {
      default: '0xcc9a0B7c43DC2a5F023Bb9b738E45B0Ef6B06E04',
      1: '0xcc9a0B7c43DC2a5F023Bb9b738E45B0Ef6B06E04',
      137: '0xbEadf48d62aCC944a06EEaE0A9054A90E5A7dc97',
    },
    'ChainLink::ETHUSD': {
      default: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      137: '0xF9680D99D6C9589e2a93a78A04A279e509205945',  // ETH/USD (polygon 上 Aave 计价单位依然是 ETH)
    },
  }
}
