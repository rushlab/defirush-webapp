const markets = require('./markets.json');
const markets137 = require('./markets.137.json');

// const crTokensAddresses = {};
// for (const item of markets) {
//   crTokensAddresses[item.symbol] = item.address;
// }

module.exports = {
  markets: {
    default: [ ...markets ],
    1: [ ...markets ],
    137: [ ...markets137 ],
  },
  addresses: {
    // ...crTokensAddresses,  // crToken 不需要放进 namedAccounts 里面
    Comptroller: {
      default: '0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258',
      1: '0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258',
      137: '0x20CA53E2395FA571798623F1cFBD11Fe2C114c24',
    },
    PriceOracleProxy: {
      default: '0x647A539282e8456A64DFE28923B7999b66091488',
      1: '0x647A539282e8456A64DFE28923B7999b66091488',
    },
    PriceOracleProxyUSD: {
      137: '0x812C0b2a2A0A74f6f6ed620Fbd2B67Fec7DB2190',
    },
    'ChainLink::ETHUSD': {
      default: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      1: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      137: '0xF9680D99D6C9589e2a93a78A04A279e509205945',
    },
  }
}
