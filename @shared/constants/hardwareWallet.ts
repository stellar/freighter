export enum WalletType {
  LEDGER = "Ledger",
  NONE = "",
}

export type ConfigurableWalletType = Exclude<WalletType, WalletType.NONE>;
