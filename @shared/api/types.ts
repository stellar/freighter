import BigNumber from "bignumber.js";
import { Horizon } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";

import { SERVICE_TYPES, EXTERNAL_SERVICE_TYPES } from "../constants/services";
import { APPLICATION_STATE } from "../constants/applicationState";
import { WalletType } from "../constants/hardwareWallet";
import { NetworkDetails } from "../constants/stellar";
import { AssetBalance, NativeBalance } from "@stellar/wallet-sdk/dist/types";

export enum ActionStatus {
  IDLE = "IDLE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

export interface UserInfo {
  publicKey: string;
}

export type MigratableAccount = Account & { keyIdIndex: number };

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
  signedBlob: string;
  signedAuthEntry: string;
  source: string;
  type: SERVICE_TYPES;
  url: string;
  isDataSharingAllowed: boolean;
  isTestnet: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
  isValidatingSafeAssetsEnabled: boolean;
  isExperimentalModeEnabled: boolean;
  isSorobanPublicEnabled: boolean;
  isRpcHealthy: boolean;
  settingsState: IndexerDataState;
  networkDetails: NetworkDetails;
  sorobanRpcUrl: string;
  networksList: NetworkDetails[];
  allAccounts: Array<Account>;
  migratedAccounts: MigratedAccount[];
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
  blockedAccounts: BlockedAccount[];
  assetDomain: string;
  contractId: string;
  tokenId: string;
  tokenIdList: string[];
  isConnected: boolean;
  isAllowed: boolean;
  userInfo: UserInfo;
  allowList: string[];
  migratableAccounts: MigratableAccount[];
  balancesToMigrate: BalanceToMigrate[];
  isMergeSelected: boolean;
  recommendedFee: string;
}

export interface BlockedDomains {
  [key: string]: boolean;
}

export interface BlockedAccount {
  address: string;
  name: string;
  domain: string | null;
  tags: string[];
}

export interface ExternalRequestBase {
  network: string;
  networkPassphrase: string;
  accountToSign: string;
  type: EXTERNAL_SERVICE_TYPES;
}

export interface ExternalRequestTx extends ExternalRequestBase {
  transactionXdr: string;
}

export interface ExternalRequestBlob extends ExternalRequestBase {
  blob: string;
}

export interface ExternalRequestAuthEntry extends ExternalRequestBase {
  entryXdr: string;
}

export type ExternalRequest =
  | ExternalRequestTx
  | ExternalRequestBlob
  | ExternalRequestAuthEntry;

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

export enum IndexerDataState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  ERROR = "ERROR",
  SUCCESS = "SUCCESS",
}

export interface IndexerSettings {
  settingsState: IndexerDataState;
  isSorobanPublicEnabled: boolean;
  isRpcHealthy: boolean;
}

export type Settings = {
  allowList: string[];
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

export interface TokenBalance extends AssetBalance {
  decimals: number;
  name: string;
}

export interface BalanceMap {
  [key: string]: AssetBalance | NativeBalance | TokenBalance;
  native: NativeBalance;
}

export type Balances = BalanceMap | null;

export interface SorobanBalance {
  contractId: string;
  total: BigNumber;
  name: string;
  symbol: string;
  decimals: number;
  token?: { code: string; issuer: { key: string } };
}

export type AssetType = Types.AssetBalance | Types.NativeBalance | TokenBalance;

export type TokenBalances = SorobanBalance[];

/* eslint-disable camelcase */
export type HorizonOperation = any;
/* eslint-enable camelcase */

export interface AccountBalancesInterface {
  balances: Balances;
  tokensWithNoBalance: string[];
  isFunded: boolean | null;
  subentryCount: number;
}

export interface AccountHistoryInterface {
  operations: Array<HorizonOperation> | [];
}

export interface ErrorMessage {
  errorMessage: string;
  response?: Horizon.HorizonApi.ErrorResponseData.TransactionFailed;
}

export interface BalanceToMigrate {
  publicKey: string;
  name: string;
  minBalance: string;
  xlmBalance: string;
  trustlineBalances: Horizon.HorizonApi.BalanceLine[];
  keyIdIndex: number;
}

export type MigratedAccount = BalanceToMigrate & {
  newPublicKey: string;
  isMigrated: boolean;
};

declare global {
  interface Window {
    freighter: boolean;
    freighterApi: { [key: string]: any };
  }
}
