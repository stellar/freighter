import { WalletType } from "@shared/constants/hardwareWallet";
import { SERVICE_TYPES } from "@shared/constants/services";
import { NetworkDetails } from "@shared/constants/stellar";

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
  | ShowBackupPhraseMessage;
