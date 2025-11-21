import BigNumber from "bignumber.js";
import { AssetType as SdkAssetType, Horizon } from "stellar-sdk";
import Blockaid from "@blockaid/client";

import {
  SERVICE_TYPES,
  EXTERNAL_SERVICE_TYPES,
} from "../../constants/services";
import { APPLICATION_STATE } from "../../constants/applicationState";
import { WalletType } from "../../constants/hardwareWallet";
import { NetworkDetails } from "../../constants/stellar";
import {
  AssetsLists,
  AssetsListItem,
} from "../../constants/soroban/asset-list";

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

export type IssuerKey = string; // {assetCode}:{issuer/contract ID} issuer pub key for classic, contract ID for tokens
export type AssetVisibility = "visible" | "hidden";

export interface AllowList {
  [networkName: string]: {
    [publicKey: string]: string[];
  };
}
export interface Response {
  error: string;
  apiError: FreighterApiError;
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
  signerAddress: string;
  signedTransaction: string;
  signedPayload: string | Buffer;
  signedBlob: Buffer | null;
  signedAuthEntry: Buffer | null;
  source: string;
  type: SERVICE_TYPES;
  url: string;
  isDataSharingAllowed: boolean;
  isTestnet: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
  isValidatingSafeAssetsEnabled: boolean;
  isExperimentalModeEnabled: boolean;
  isHashSigningEnabled: boolean;
  isSorobanPublicEnabled: boolean;
  isRpcHealthy: boolean;
  userNotification: UserNotification;
  assetsLists: AssetsLists;
  assetsList: AssetsListItem;
  isDeleteAssetsList: boolean;
  settingsState: SettingsState;
  experimentalFeaturesState: SettingsState;
  networkDetails: NetworkDetails;
  sorobanRpcUrl: string;
  networksList: NetworkDetails[];
  allAccounts: Account[];
  migratedAccounts: MigratedAccount[];
  accountName: string;
  assetCode: string;
  assetCanonical: string;
  iconUrl: string;
  network: string;
  networkIndex: number;
  networkName: string;
  recentAddresses: string[];
  lastUsedAccount: string;
  hardwareWalletType: WalletType;
  bipPath: string;
  memoRequiredAccounts: MemoRequiredAccount[];
  assetDomain: string;
  contractId: string;
  tokenId: string;
  tokenIdList: string[];
  isConnected: boolean;
  isAllowed: boolean;
  userInfo: UserInfo;
  domain: string;
  allowList: AllowList;
  migratableAccounts: MigratableAccount[];
  balancesToMigrate: BalanceToMigrate[];
  isMergeSelected: boolean;
  recommendedFee: string;
  isNonSSLEnabled: boolean;
  isHideDustEnabled: boolean;
  activePublicKey: string;
  isAccountMismatch: boolean;
  assetVisibility: {
    issuer: IssuerKey;
    visibility: AssetVisibility;
  };
  hiddenAssets: Record<IssuerKey, AssetVisibility>;
  isOverwritingAccount: boolean;
  isDismissed: boolean;
}

export interface MemoRequiredAccount {
  address: string;
  name: string;
  domain: string | null;
  tags: string[];
}

export interface ExternalRequestBase {
  accountToSign?: string;
  address?: string;
  networkPassphrase?: string;
  type: EXTERNAL_SERVICE_TYPES;
}

export interface ExternalRequestToken extends ExternalRequestBase {
  contractId: string;
}

export interface ExternalRequestTx extends ExternalRequestBase {
  transactionXdr: string;
  network?: string;
}

export interface ExternalRequestBlob extends ExternalRequestBase {
  apiVersion: string;
  blob: string;
}

export interface ExternalRequestAuthEntry extends ExternalRequestBase {
  apiVersion: string;
  entryXdr: string;
}

export type ExternalRequest =
  | ExternalRequestToken
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
  networksList: NetworkDetails[];
  isHideDustEnabled: boolean;
  error: string;
}

export interface ExperimentalFeatures {
  isExperimentalModeEnabled: boolean;
  isHashSigningEnabled: boolean;
  isNonSSLEnabled: boolean;
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
  experimentalFeaturesState: SettingsState;
}

export enum SettingsState {
  IDLE = "IDLE",
  LOADING = "LOADING",
  ERROR = "ERROR",
  SUCCESS = "SUCCESS",
}

export interface UserNotification {
  enabled: boolean;
  message: string;
}

export interface IndexerSettings {
  settingsState: SettingsState;
  isSorobanPublicEnabled: boolean;
  isRpcHealthy: boolean;
  userNotification: UserNotification;
}

export type Settings = {
  allowList: AllowList;
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

export interface SoroswapToken {
  code: string;
  contract: string;
  decimals: number;
  icon: string;
  name: string;
}

export interface NativeToken {
  type: SdkAssetType;
  code: string;
}

export interface Issuer {
  key: string;
  name?: string;
  url?: string;
  hostName?: string;
}

export interface AssetToken {
  type: SdkAssetType;
  code: string;
  issuer: Issuer;
  anchorAsset?: string;
  numAccounts?: BigNumber;
  amount?: BigNumber;
  bidCount?: BigNumber;
  askCount?: BigNumber;
  spread?: BigNumber;
}

export type Token = NativeToken | AssetToken;

export interface Balance {
  token: Token;

  // for non-native tokens, this should be total - sellingLiabilities
  // for native, it should also subtract the minimumBalance
  available: BigNumber;
  total: BigNumber;
  buyingLiabilities: string;
  sellingLiabilities: string;
  liquidityPoolId?: string;
  reserves?: Horizon.HorizonApi.Reserve[];
  contractId?: string;
  blockaidData: BlockAidScanAssetResult;
}

export type BlockAidScanAssetResult = Blockaid.TokenScanResponse;

export type BlockAidScanSiteResult = Blockaid.SiteScanResponse;
export type BlockAidScanTxResult = Blockaid.StellarTransactionScanResponse & {
  request_id: string;
};
export type BlockAidBulkScanAssetResult = Blockaid.TokenBulkScanResponse;
export type BlockaidAssetDiff =
  | Blockaid.StellarTransactionScanResponse.StellarSimulationResult.StellarLegacyAssetDiff
  | Blockaid.StellarTransactionScanResponse.StellarSimulationResult.StellarNativeAssetDiff
  | Blockaid.StellarTransactionScanResponse.StellarSimulationResult.StellarContractAssetDiff;

export interface AssetBalance extends Balance {
  limit: BigNumber;
  token: AssetToken;
  sponsor?: string;
}

export interface NativeBalance extends Balance {
  token: NativeToken;
  minimumBalance: BigNumber;
}

export interface TokenBalance extends AssetBalance {
  name: string;
  symbol: string;
  decimals: number;
  total: BigNumber;
}

export interface SorobanBalance {
  contractId: string;
  total: BigNumber;
  name: string;
  symbol: string;
  decimals: number;
  token?: { code: string; issuer: { key: string } };
}

export type TokenBalances = SorobanBalance[];

export type HorizonOperation = Horizon.ServerApi.OperationRecord & {
  account: string;
  amount?: string;
  starting_balance?: string;
  asset_code?: string;
  asset_issuer?: string;
  asset_type?: string;
  transaction_attr: Horizon.ServerApi.TransactionRecord & {
    contractId?: string;
    fnName: string;
    args: {
      [key: string]: any;
    };
  };
  to_muxed?: string;
  to?: string;
  from?: string;
};

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

export interface FreighterApiError {
  code: number;
  message: string;
  ext?: string[];
}

export interface ApiTokenPrice {
  currentPrice: string;
  percentagePriceChange24h?: string;
}

export interface ApiTokenPrices {
  [key: string]: ApiTokenPrice | null;
}

export type DiscoverData = {
  description: string;
  iconUrl: string;
  name: string;
  websiteUrl: string;
  tags: string[];
  isBlacklisted: boolean;
}[];
