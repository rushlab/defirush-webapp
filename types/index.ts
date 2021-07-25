const { Provider } = require("@ethersproject/abstract-provider")
const { Signer } = require("@ethersproject/abstract-signer")
const { BigNumberish } = require("@ethersproject/bignumber")

declare type Provider = typeof Provider;
declare type Signer = typeof Signer;
declare type BigNumberish = typeof BigNumberish;

declare type Address = string;
declare type AmountDisplay = string;
declare type AmountMantissa = typeof BigNumberish;

declare interface WalletInterface {
  getAddress(): Address;
  getSigner(): Signer;
  getProvider(): Provider;
  getBalance(asset: Address): Promise<AmountDisplay>;
}

declare interface BankAppInterface {
  $wallet: WalletInterface;
  _approve(token: Address, spender: Address, amount: AmountMantissa): Promise<any>;
  _allowance(token: Address, spender: Address): Promise<AmountMantissa>;
  _displayToMantissa(amountDisplay: AmountDisplay, decimals: number): AmountMantissa;
  _mantissaToDisplay(amountMantissa: AmountMantissa, decimals: number): AmountDisplay;
  getAssetData(underlyingToken: Address): Promise<any>;
  getAccountData(): Promise<any>;
  getAccountAssetData(underlyingToken: Address): Promise<any>;
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
