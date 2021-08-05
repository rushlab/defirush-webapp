const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

const fetchFTokens = async () => {

  const bankController = new ethers.Contract('0x936E6490eD786FD0e0f0C1b1e4E1540b9D41F9eF', [
    'function getAllMarkets() external view returns (IFToken[] memory)'
  ], ethers.provider);

  const results = [];
  const fTokensAddresses = await bankController.getAllMarkets();

  for (let address of fTokensAddresses) {

    const fToken = new ethers.Contract(address, [
      'function symbol() view returns (string)',
      'function underlying() view returns (address)',
    ], ethers.provider);

    const symbol = await fToken.symbol();
    const result = { symbol, address };
    if (symbol === 'fETH') {
      result.underlyingAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      result.underlyingSymbol = 'ETH';
    } else {
      result.underlyingAddress = await fToken.underlying();
      const erc20Token = new ethers.Contract(result.underlyingAddress, [
        'function symbol() view returns (string)',
      ], ethers.provider);
      result.underlyingSymbol = await erc20Token.symbol().catch((err) => '');
    }
    results.push(result);
  }
  const content = JSON.stringify(results, null, 2);
  const jsonFilePath = path.join(__dirname, './markets.json');
  fs.writeFileSync(jsonFilePath, content + '\n', 'utf8');
}

fetchFTokens()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
