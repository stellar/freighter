import { Transaction } from "stellar-sdk";
import browser from "webextension-polyfill";

import { WalletType } from "@shared/constants/hardwareWallet";
import { SERVICE_TYPES } from "@shared/constants/services";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetVisibility, BalanceToMigrate, IssuerKey } from "./types";
import { AssetsListItem } from "@shared/constants/soroban/asset-list";

export interface TokenToAdd {
  domain: string;
  tab?: browser.Tabs.Tab;
  url: string;
  contractId: string;
  networkPassphrase?: string;
}

export interface MessageToSign {
  apiVersion?: string;
  domain: string;
  tab?: browser.Tabs.Tab;
  message: string;
  url: string;
  accountToSign?: string;
  networkPassphrase?: string;
}

export interface EntryToSign {
  domain: string;
  tab?: browser.Tabs.Tab;
  entry: string; // xdr.SorobanAuthorizationEntry
  url: string;
  accountToSign?: string;
  networkPassphrase?: string;
}

export type RequestAccessResponse = string;
export type SignAuthEntryResponse = Buffer | null;
export type SignTransactionResponse = string;
export type SignBlobResponse = Buffer | null;
export type AddTokenResponse = boolean;
export type SetAllowedStatusResponse = string;
export type SignedHwPayloadResponse = string | Buffer<ArrayBufferLike>;
export type RejectAccessResponse = undefined;
export type RejectTransactionResponse = undefined;

export type ResponseQueue<T> = Array<
  (message: T, messageAddress?: string) => void
>;

export type TokenQueue = TokenToAdd[];

export type TransactionQueue = Transaction[];

export type BlobQueue = MessageToSign[];

export type EntryQueue = EntryToSign[];

export interface BaseMessage {
  activePublicKey: string;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface FundAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.FUND_ACCOUNT;
  publicKey: string;
}

export interface CreateAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.CREATE_ACCOUNT;
  password: string;
  isOverwritingAccount: boolean;
}

export interface AddAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_ACCOUNT;
  password: string;
}

export interface ImportAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.IMPORT_ACCOUNT;
  password: string;
  privateKey: string;
}

export interface ImportHardWareWalletMessage extends BaseMessage {
  type: SERVICE_TYPES.IMPORT_HARDWARE_WALLET;
  hardwareWalletType: WalletType;
  publicKey: string;
  bipPath: string;
}

export interface MakeAccountActiveMessage extends BaseMessage {
  type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE;
  publicKey: string;
}

export interface UpdateAccountNameMessage extends BaseMessage {
  type: SERVICE_TYPES.UPDATE_ACCOUNT_NAME;
  accountName: string;
  publicKey: string;
}

export interface AddCustomNetworkMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_CUSTOM_NETWORK;
  networkDetails: NetworkDetails;
}

export interface RemoveCustomNetworkMessage extends BaseMessage {
  type: SERVICE_TYPES.REMOVE_CUSTOM_NETWORK;
  networkName: string;
}

export interface EditCustomNetworkMessage extends BaseMessage {
  type: SERVICE_TYPES.EDIT_CUSTOM_NETWORK;
  networkDetails: NetworkDetails;
  networkIndex: number;
}

export interface ChangeNetworkMessage extends BaseMessage {
  type: SERVICE_TYPES.CHANGE_NETWORK;
  networkName: string;
}

export interface LoadAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.LOAD_ACCOUNT;
}

export interface GetMnemonicPhraseMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_MNEMONIC_PHRASE;
  password: string;
}

export interface ConfirmMnemonicPhraseMessage extends BaseMessage {
  type: SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE;
  mnemonicPhraseToConfirm: string;
}

export interface ConfirmMigratedMnemonicPhraseMessage extends BaseMessage {
  type: SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE;
  mnemonicPhraseToConfirm: string;
}

export interface RecoverAccountMessage extends BaseMessage {
  type: SERVICE_TYPES.RECOVER_ACCOUNT;
  isOverwritingAccount: boolean;
  password: string;
  recoverMnemonic: string;
}

export interface ShowBackupPhraseMessage extends BaseMessage {
  type: SERVICE_TYPES.SHOW_BACKUP_PHRASE;
  password: string;
}

export interface ConfirmPasswordMessage extends BaseMessage {
  type: SERVICE_TYPES.CONFIRM_PASSWORD;
  password: string;
}

export interface GrantAccessMessage extends BaseMessage {
  type: SERVICE_TYPES.GRANT_ACCESS;
  url: string;
}

export interface RejectAccessMessage extends BaseMessage {
  type: SERVICE_TYPES.REJECT_ACCESS;
}

export interface HandleSignedHWPayloadMessage extends BaseMessage {
  type: SERVICE_TYPES.HANDLE_SIGNED_HW_PAYLOAD;
  signedPayload: string | Buffer<ArrayBufferLike>;
}

export interface AddTokenMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_TOKEN;
}

export interface SignTransactionMessage extends BaseMessage {
  type: SERVICE_TYPES.SIGN_TRANSACTION;
}

export interface SignBlobMessage extends BaseMessage {
  apiVersion?: string;
  type: SERVICE_TYPES.SIGN_BLOB;
}

export interface SignAuthEntryMessage extends BaseMessage {
  type: SERVICE_TYPES.SIGN_AUTH_ENTRY;
}

export interface RejectTransactionMessage extends BaseMessage {
  type: SERVICE_TYPES.REJECT_TRANSACTION;
}

export interface SignFreighterTransactionMessage extends BaseMessage {
  type: SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION;
  network: string;
  transactionXDR: string;
}

export interface SignFreighterSorobanTransactionMessage extends BaseMessage {
  type: SERVICE_TYPES.SIGN_FREIGHTER_SOROBAN_TRANSACTION;
  network: string;
  transactionXDR: string;
}

export interface AddRecentAddressMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_RECENT_ADDRESS;
  address: string;
}

export interface LoadRecentAddressesMessage extends BaseMessage {
  type: SERVICE_TYPES.LOAD_RECENT_ADDRESSES;
}

export interface LoadLastAccountUsedMessage extends BaseMessage {
  type: SERVICE_TYPES.LOAD_LAST_USED_ACCOUNT;
}

export interface SignOutMessage extends BaseMessage {
  type: SERVICE_TYPES.SIGN_OUT;
}

export interface SaveAllowListMessage extends BaseMessage {
  type: SERVICE_TYPES.SAVE_ALLOWLIST;
  networkName: string;
  domain: string;
}

export interface SaveSettingsMessage extends BaseMessage {
  type: SERVICE_TYPES.SAVE_SETTINGS;
  isHideDustEnabled: boolean;
  isMemoValidationEnabled: boolean;
  isDataSharingAllowed: boolean;
}

export interface SaveExperimentalFeaturesMessage extends BaseMessage {
  type: SERVICE_TYPES.SAVE_EXPERIMENTAL_FEATURES;
  isExperimentalModeEnabled: boolean;
  isHashSigningEnabled: boolean;
  isNonSSLEnabled: boolean;
}

export interface LoadSettingsMessage extends BaseMessage {
  type: SERVICE_TYPES.LOAD_SETTINGS;
}

export interface LoadBackendSettingsMessage extends BaseMessage {
  type: SERVICE_TYPES.LOAD_BACKEND_SETTINGS;
}

export interface GetCachedAssetIconListMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_CACHED_ASSET_ICON_LIST;
}

export interface GetCachedAssetIconMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_CACHED_ASSET_ICON;
  assetCanonical: string;
}

export interface CacheAssetIconMessage extends BaseMessage {
  type: SERVICE_TYPES.CACHE_ASSET_ICON;
  assetCanonical: string;
  iconUrl: string;
}

export interface GetCachedDomainMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_CACHED_ASSET_DOMAIN;
  assetCanonical: string;
}

export interface CacheDomainMessage extends BaseMessage {
  type: SERVICE_TYPES.CACHE_ASSET_DOMAIN;
  assetCanonical: string;
  assetDomain: string;
}

export interface GetMemoRequiredAccountsMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_MEMO_REQUIRED_ACCOUNTS;
}

export interface ResetExperimentalDataMessage extends BaseMessage {
  type: SERVICE_TYPES.RESET_EXP_DATA;
}

export interface AddTokenIdMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_TOKEN_ID;
  tokenId: string;
  network: string;
  publicKey: string;
}

export interface GetTokenIdsMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_TOKEN_IDS;
  network: string;
}

export interface RemoveTokenIdMessage extends BaseMessage {
  type: SERVICE_TYPES.REMOVE_TOKEN_ID;
  contractId: string;
  network: string;
}

export interface GetMigratableAccountsMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_MIGRATABLE_ACCOUNTS;
}

export interface GetMigratedMnemonicPhraseMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_MIGRATED_MNEMONIC_PHRASE;
}

export interface MigrateAccountsMessage extends BaseMessage {
  type: SERVICE_TYPES.MIGRATE_ACCOUNTS;
  balancesToMigrate: BalanceToMigrate[];
  isMergeSelected: boolean;
  recommendedFee: string;
  password: string;
}

export interface AddAssetsListMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_ASSETS_LIST;
  network: string;
  assetsList: AssetsListItem;
}

export interface ModifyAssetsListMessage extends BaseMessage {
  type: SERVICE_TYPES.MODIFY_ASSETS_LIST;
  network: string;
  assetsList: AssetsListItem;
  isDeleteAssetsList: boolean;
}

export interface GetIsAccountMismatchMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_IS_ACCOUNT_MISMATCH;
  activePublicKey: string;
}

export interface ChangeAssetVisibilityMessage extends BaseMessage {
  type: SERVICE_TYPES.CHANGE_ASSET_VISIBILITY;
  assetVisibility: {
    issuer: IssuerKey;
    visibility: AssetVisibility;
  };
}

export interface GetHiddenAssetsMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_HIDDEN_ASSETS;
}

export interface GetMobileAppBannerDismissedMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_MOBILE_APP_BANNER_DISMISSED;
}

export interface DismissMobileAppBannerMessage extends BaseMessage {
  type: SERVICE_TYPES.DISMISS_MOBILE_APP_BANNER;
}

export interface AddCollectibleMessage extends BaseMessage {
  type: SERVICE_TYPES.ADD_COLLECTIBLE;
  network: string;
  publicKey: string;
  collectibleContractAddress: string;
  collectibleTokenId: string;
}

export interface GetCollectiblesMessage extends BaseMessage {
  type: SERVICE_TYPES.GET_COLLECTIBLES;
  publicKey: string;
  network: string;
}

export type ServiceMessageRequest =
  | FundAccountMessage
  | CreateAccountMessage
  | AddAccountMessage
  | ImportAccountMessage
  | ImportHardWareWalletMessage
  | MakeAccountActiveMessage
  | UpdateAccountNameMessage
  | AddCustomNetworkMessage
  | RemoveCustomNetworkMessage
  | EditCustomNetworkMessage
  | ChangeNetworkMessage
  | LoadAccountMessage
  | GetMnemonicPhraseMessage
  | ConfirmMnemonicPhraseMessage
  | ConfirmMigratedMnemonicPhraseMessage
  | RecoverAccountMessage
  | ShowBackupPhraseMessage
  | ConfirmPasswordMessage
  | GrantAccessMessage
  | RejectAccessMessage
  | HandleSignedHWPayloadMessage
  | AddTokenMessage
  | SignTransactionMessage
  | SignBlobMessage
  | SignAuthEntryMessage
  | RejectTransactionMessage
  | SignFreighterTransactionMessage
  | SignFreighterSorobanTransactionMessage
  | AddRecentAddressMessage
  | LoadRecentAddressesMessage
  | LoadLastAccountUsedMessage
  | SignOutMessage
  | SaveAllowListMessage
  | SaveSettingsMessage
  | SaveExperimentalFeaturesMessage
  | LoadSettingsMessage
  | LoadBackendSettingsMessage
  | GetCachedAssetIconListMessage
  | GetCachedAssetIconMessage
  | CacheAssetIconMessage
  | GetCachedDomainMessage
  | CacheDomainMessage
  | GetMemoRequiredAccountsMessage
  | ResetExperimentalDataMessage
  | AddTokenIdMessage
  | GetTokenIdsMessage
  | RemoveTokenIdMessage
  | GetMigratableAccountsMessage
  | GetMigratedMnemonicPhraseMessage
  | MigrateAccountsMessage
  | AddAssetsListMessage
  | ModifyAssetsListMessage
  | GetIsAccountMismatchMessage
  | ChangeAssetVisibilityMessage
  | GetHiddenAssetsMessage
<<<<<<< HEAD
  | GetMobileAppBannerDismissedMessage
  | DismissMobileAppBannerMessage;
=======
  | AddCollectibleMessage
  | GetCollectiblesMessage;
>>>>>>> b8f947a2 (add localstorage and caching; add tests)
