export const lendingPoolAddress = '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9'
export const lendingPoolABI = [
  'function deposit(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
  'function withdraw(address asset, uint256 amount, address to)',
  'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)',
  'function repay(address asset, uint256 amount, uint256 rateMode, address onBehalfOf)',
  'function swapBorrowRateMode(address asset, uint256 rateMode)',
  'function setUserUseReserveAsCollateral(address asset, bool useAsCollateral)',
  'function liquidationCall(address collateral, address debt, address user, uint256 debtToCover, bool receiveAToken)',
  'function flashLoan(address receiverAddress, address[] calldata assets, uint256[] calldata amounts, uint256[] modes, address onBehalfOf, bytes calldata params, uint16 referralCode)',
  'function getReserveData(address asset) view returns (tuple memory)',
  'function getUserAccountData(address user) view returns (uint256 totalCollateralETH, uint256 totalDebtETH, uint256 availableBorrowsETH, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)',
  'function getConfiguration(address asset) view returns (tuple memory)',
  'function getUserConfiguration(address user) view returns (tuple memory)',
  'function getReserveNormalizedIncome(address asset) view returns (uint256)',
  'function getReserveNormalizedVariableDebt(address asset) view returns (uint256)',
  'function paused() view',
  'function getReservesList() view returns (address[] memory)',
  'function getAddressesProvider() view returns (ILendingPoolAddressesProvider)',
]

export const addressesProviderAddress = '0xb53c1a33016b2dc2ff3653530bff1848a515c8c5'
export const addressesProviderABI = [
  'function getMarketId() view',
  'function getLendingPool() view',
  'function getLendingPoolConfigurator() view',
  'function getLendingPoolCollateralManager() view',
  'function getPoolAdmin() view',
  'function getPoolEmergencyAdmin() view',
  'function getPriceOracle() view',
  'function getLendingRateOracle() view',
  'function getAddress(bytes32 id) view'
]

export const priceOracleAddress = '0xA50ba011c48153De246E5192C8f9258A2ba79Ca9'
export const priceOracleABI = [
  'function getAssetPrice(address asset) view returns (uint256)'
]

export const WETHGatewayAddress = '0xcc9a0B7c43DC2a5F023Bb9b738E45B0Ef6B06E04'
export const WETHGatewayABI = [
  "function depositETH(address lendingPool, address onBehalfOf, uint16 referralCode) payable override",
  "function withdrawETH(address lendingPool, uint256 amount, address to) override",
  "function repayETH(address lendingPool, uint256 amount, uint256 rateMode, address onBehalfOf) payable override",
  "function borrowETH(address lendingPool, uint256 amount, uint256 interestRateMode, uint16 referralCode) override"
]

export const WethTokenAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'  // weth token
export const EthTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'   // eth