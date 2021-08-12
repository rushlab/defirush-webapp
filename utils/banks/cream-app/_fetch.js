const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

const fetchCrTokens = async () => {
  // polygon comptroller 0x20CA53E2395FA571798623F1cFBD11Fe2C114c24
  const comptroller = new ethers.Contract('0x3d5BC3c8d13dcB8bF317092d84783c2697AE9258', [
    'function getAllMarkets() view returns (address[])'
  ], ethers.provider);
  const results = [];
  const crTokensAddresses = await comptroller.getAllMarkets();
  for (let address of crTokensAddresses) {
    const crToken = new ethers.Contract(address, [
      'function symbol() view returns (string)',
      'function underlying() view returns (address)',
    ], ethers.provider);
    const symbol = await crToken.symbol();
    const result = { symbol, address };
    if (symbol === 'crETH') {
      result.underlyingAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      result.underlyingSymbol = 'ETH';
    } else {
      result.underlyingAddress = await crToken.underlying();
      const erc20Token = new ethers.Contract(result.underlyingAddress, [
        'function symbol() view returns (string)',
      ], ethers.provider);
      result.underlyingSymbol = await erc20Token.symbol();
    }
    console.log(result);
    results.push(result);
  }
  const content = JSON.stringify(results, null, 2);
  const jsonFilePath = path.join(__dirname, './markets.json');
  fs.writeFileSync(jsonFilePath, content + '\n', 'utf8');
}

fetchCrTokens()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
