// https://github.com/stellar/soroban-examples/blob/main/token/src/contract.rs
export enum SorobanTokenInterface {
  transfer = "transfer",
  mint = "mint",
}

export enum SorbanCollectibleInterface {
  transfer = "transfer",
}

export type ArgsForTransferInvocation = {
  from: string;
  to: string;
  amount?: bigint | number;
  tokenId?: number;
};

export type HostFnInvocationArgs = ArgsForTransferInvocation & {
  fnName: SorobanTokenInterface | SorbanCollectibleInterface;
  contractId: string;
};

// TODO: can we generate this at build time using the cli TS generator? Also should we?
export interface SorobanToken {
  // only currently holds fields we care about
  transfer: (from: string, to: string, amount: number) => void;
  mint: (to: string, amount: number) => void;
  // values below are in storage
  name: string;
  balance: number;
  symbol: string;
  decimals: number;
}
