import BigNumber from "bignumber.js";
import { Horizon } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { SERVICE_TYPES, EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { APPLICATION_STATE } from "../constants/applicationState";
import { WalletType } from "../constants/hardwareWallet";
import { NetworkDetails } from "../constants/stellar";

export enum ActionStatus {
  IDLE = "IDLE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export enum SorobanTxStatus {
  PENDING = "pending",
  SUCCESS = "success",
}

export interface Response {
  error: string;
  messagedId: number;
  applicationState: APPLICATION_STATE;
  publicKey: string;
  privateKey: string;
  hasPrivateKey: boolean;
  mnemonicPhrase: string;
  isCorrectPhrase: boolean;
  confirmedPassword: boolean;
  password: string;
  mnemonicPhraseToConfirm: string;
  recoverMnemonic: string;
  transaction: {
    sign: (sourceKeys: {}) => void;
  };
  transactionXDR: string;
  signedTransaction: string;
  source: string;
  type: SERVICE_TYPES;
  url: string;
  isDataSharingAllowed: boolean;
  isTestnet: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
  isValidatingSafeAssetsEnabled: boolean;
  isExperimentalModeEnabled: boolean;
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
  allAccounts: Array<Account>;
  accountName: string;
  assetCode: string;
  assetCanonical: string;
  iconUrl: string;
  network: string;
  networkIndex: number;
  networkName: string;
  recentAddresses: Array<string>;
  hardwareWalletType: WalletType;
  bipPath: string;
  blockedDomains: BlockedDomains;
  assetDomain: string;
  status: string;
  sep24Data: Sep24Data;
  tokenId: string;
  tokenIdList: string[];
}

export interface BlockedDomains {
  [key: string]: boolean;
}

export interface ExternalRequest {
  transactionXdr: string;
  network: string;
  networkPassphrase: string;
  accountToSign: string;
  type: EXTERNAL_SERVICE_TYPES;
}

export interface Account {
  publicKey: string;
  name: string;
  imported: boolean;
  hardwareWalletType?: WalletType;
}

export enum AccountType {
  HW = "HW",
  IMPORTED = "IMPORTED",
  FREIGHTER = "FREIGHTER",
}

export interface Preferences {
  isDataSharingAllowed: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
  isValidatingSafeAssetsEnabled: boolean;
  networksList: NetworkDetails[];
  error: string;
  isExperimentalModeEnabled: boolean;
}

export type Settings = {
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
  error: string;
} & Preferences;

export interface AssetIcons {
  [code: string]: string;
}

export interface AssetDomains {
  [code: string]: string;
}

export type Balances = Types.BalanceMap | null;

export interface SorobanBalance {
  contractId: string;
  total: BigNumber;
  name: string;
  symbol: string;
  decimals: string;
}

export type AssetType =
  | Types.AssetBalance
  | Types.NativeBalance
  | SorobanBalance;

export type TokenBalances = SorobanBalance[];

/* eslint-disable camelcase */
export type HorizonOperation = any;
/* eslint-enable camelcase */

export interface AccountBalancesInterface {
  balances: Balances;
  isFunded: boolean | null;
  subentryCount: number;
}

export interface AccountHistoryInterface {
  operations: Array<HorizonOperation> | [];
}

export interface Sep24Data {
  sep10Url: string;
  sep24Url: string;
  publicKey: string;
  txId: string;
  status: string;
  anchorDomain: string;
  asset: string;
}

export interface ErrorMessage {
  errorMessage: string;
  response?: Horizon.ErrorResponseData.TransactionFailed;
}

declare global {
  interface Window {
    freighter: boolean;
    freighterApi: { [key: string]: any };
  }
}

export type CURRENCY = { code: string; issuer: string; image: string };
