const markets = require('./markets.json');

const fTokensAddresses = {};
for (const item of markets) {
  fTokensAddresses[item.symbol] = item.address;
}

module.exports = {
  markets,
  addresses: {
    ...fTokensAddresses,
    BankController: '0x936E6490eD786FD0e0f0C1b1e4E1540b9D41F9eF',
    Bank: '0xdE7B3b2Fe0E7b4925107615A5b199a4EB40D9ca9'
  }
}
