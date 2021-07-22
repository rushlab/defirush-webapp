const { Provider } = require("@ethersproject/abstract-provider")
const { Signer } = require("@ethersproject/abstract-signer")
const { BigNumberish } = require("@ethersproject/bignumber")

declare type Provider = typeof Provider;
declare type Signer = typeof Signer;
declare type BigNumberish = typeof BigNumberish;

declare type Address = string;
declare type AmountDisplay = string;
declare type AmountMantissa = typeof BigNumberish;

declare type AssetData = {
  totalDeposits: string;
  totalBorrows: string;
  depositAPY: string;
  borrowAPY: string;
  priceUSD: string;
}

declare interface BankAppInterface {
  signer: typeof Signer;
  provider: typeof Provider;
  _userAddress: Address | null;
  _getUserAddress(): Promise<any>;
  _approve(token: Address, spender: Address, amount: AmountMantissa): Promise<any>;
  _allowance(token: Address, spender: Address): Promise<AmountMantissa>;
  _displayToMantissa(amountDisplay: AmountDisplay, decimals: number): AmountMantissa;
  _mantissaToDisplay(amountMantissa: AmountMantissa, decimals: number): AmountDisplay;
  getAssetData(asset: Address): Promise<AssetData>;
  getAccountData(): Promise<any>;
  getAccountAssetData(asset: Address): Promise<any>;
  approveUnderlying(underlyingToken: Address, amountDisplay: AmountDisplay): Promise<any>;
  underlyingAllowance(underlyingToken: Address): Promise<any>;
  enableUnderlying(underlyingToken: Address): Promise<any>;
  underlyingEnabled(underlyingToken: Address): Promise<any>;
  deposit(underlyingToken: Address, amountDisplay: AmountDisplay): Promise<any>;
  borrow(underlyingToken: Address, amountDisplay: AmountDisplay): Promise<any>;
  repay(underlyingToken: Address, amountDisplay: AmountDisplay): Promise<any>;
  repayAll(underlyingToken: Address): Promise<any>;
  withdraw(underlyingToken: Address, amountDisplay: AmountDisplay): Promise<any>;
  withdrawAll(underlyingToken: Address): Promise<any>;
}