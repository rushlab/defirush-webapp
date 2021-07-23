const markets = require('./markets.json');

const crTokensAddresses = {};
for (const item of markets) {
  crTokensAddresses[item.symbol] = item.address;
}

module.exports = {
  markets,
  addresses: {
    ...crTokensAddresses,
    Comptroller: '0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258',
    PriceOracleProxy: '0x647A539282e8456A64DFE28923B7999b66091488',
    'ChainLink::ETHUSD': '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
  }
}
