import { Transaction } from "stellar-sdk";
import browser from "webextension-polyfill";

import { WalletType } from "@shared/constants/hardwareWallet";
import { SERVICE_TYPES } from "@shared/constants/services";
import { NetworkDetails } from "@shared/constants/stellar";

export interface TokenToAdd {
  domain: string;
  tab?: browser.Tabs.Tab;
  url: string;
  contractId: string;
  networkPassphrase?: string;
}

export interface MessageToSign {
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

export type ResponseQueue = Array<
  (message?: any, messageAddress?: any) => void
>;

export type TokenQueue = TokenToAdd[];

export type TransactionQueue = Transaction[];

export type BlobQueue = MessageToSign[];

export type EntryQueue = EntryToSign[];

export interface BaseMessage {
  activePublicKey: string;
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
  publicKey: string;
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
  | SaveExperimentalFeaturesMessage;
