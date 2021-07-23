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
  }
}
