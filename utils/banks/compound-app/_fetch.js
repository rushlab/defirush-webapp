const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

const fetchCrTokens = async () => {
  const comptroller = new ethers.Contract('0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b', [
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
    if (symbol === 'cETH') {
      result.underlyingAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
      result.underlyingSymbol = 'ETH';
    } else {
      result.underlyingAddress = await crToken.underlying();
      const erc20Token = new ethers.Contract(result.underlyingAddress, [
        'function symbol() view returns (string)',
      ], ethers.provider);
      result.underlyingSymbol = await erc20Token.symbol().catch((err) => '');
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
