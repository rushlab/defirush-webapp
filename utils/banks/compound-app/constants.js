const markets = require('./markets.json');

const cTokensAddresses = {};
for (const item of markets) {
  cTokensAddresses[item.symbol] = item.address;
}

module.exports = {
  markets,
  addresses: {
    ...cTokensAddresses,
    Comptroller: '0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b',
  }
}
