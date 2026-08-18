import { BlockAidScanTxResult } from "@shared/api/types";

export interface FlaggedKeys {
  [address: string]: {
    tags: Array<string>;
  };
}

export interface SimulateTxData {
  transactionXdr: string;
  scanResult?: BlockAidScanTxResult | null;
  inclusionFee?: string;
  resourceFee?: string;
}

export type SimulateResult =
  | { ok: true; data: SimulateTxData }
  | { ok: false; error: string };

export interface TransactionInfo {
  url: string;
  tab: any;
  transaction: { [key: string]: any };
  transactionXdr: string;
  flaggedKeys: FlaggedKeys;
  title?: string;
  accountToSign?: string;
  uuid: string;
}
