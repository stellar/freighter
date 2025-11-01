import { Store } from "redux";
import {
  ResponseQueue,
  ServiceMessageRequest,
  TransactionQueue,
  SignTransactionResponse,
  SignBlobResponse,
  SignAuthEntryResponse,
  AddTokenResponse,
  RequestAccessResponse,
  SetAllowedStatusResponse,
  RejectAccessResponse,
  RejectTransactionResponse,
  SignedHwPayloadResponse,
} from "@shared/api/types/message-request";
import { SERVICE_TYPES } from "@shared/constants/services";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { SessionTimer } from "background/helpers/session";
import { publicKeySelector } from "background/ducks/session";
import { EntryToSign, MessageToSign, TokenToAdd } from "helpers/urls";

import { fundAccount } from "./handlers/fundAccount";
import { createAccount } from "./handlers/createAccount";
import { addAccount } from "./handlers/addAccount";
import { importAccount } from "./handlers/importAccount";
import { importHardwareWallet } from "./handlers/importHardwareWallet";
import { makeAccountActive } from "./handlers/makeAccountActive";
import { updateAccountName } from "./handlers/updateAccountName";
import { addCustomNetwork } from "./handlers/addCustomNetwork";
import { removeCustomNetwork } from "./handlers/removeCustomNetwork";
import { editCustomNetwork } from "./handlers/editCustomNetwork";
import { changeNetwork } from "./handlers/changeNetwork";
import { loadAccount } from "./handlers/loadAccount";
import { getMnemonicPhrase } from "./handlers/getMnemonicPhrase";
import { confirmMnemonicPhrase } from "./handlers/confirmMnemonicPhrase";
import { confirmMigratedMnemonicPhrase } from "./handlers/confirmMigratedMnemonicPhrase";
import { recoverAccount } from "./handlers/recoverAccount";
import { showBackupPhrase } from "./handlers/showBackupPhrase";
import { confirmPassword } from "./handlers/confirmPassword";
import { grantAccess } from "./handlers/grantAccess";
import { rejectAccess } from "./handlers/rejectAccess";
import { handleSignedHwPayload } from "./handlers/handleSignedHwPayload";
import { addToken } from "./handlers/addToken";
import { signTransaction } from "./handlers/signTransaction";
import { signBlob } from "./handlers/signBlob";
import { signAuthEntry } from "./handlers/signAuthEntry";
import { rejectTransaction } from "./handlers/rejectTransaction";
import { signFreighterTransaction } from "./handlers/signFreighterTransaction";
import { addRecentAddress } from "./handlers/addRecentAddress";
import { loadRecentAddresses } from "./handlers/loadRecentAddresses";
import { loadLastUsedAccount } from "./handlers/loadLastAccountUsed";
import { signOut } from "./handlers/signOut";
import { saveAllowList } from "./handlers/saveAllowList";
import { saveSettings } from "./handlers/saveSettings";
import { saveExperimentalFeatures } from "./handlers/saveExperimentalFeatures";
import { loadSettings } from "./handlers/loadSettings";
import { getCachedAssetIconList } from "./handlers/getCachedAssetIconList";
import { getCachedAssetIcon } from "./handlers/getCachedAssetIcons";
import { cacheAssetIcon } from "./handlers/cacheAssetIcon";
import { getCachedAssetDomain } from "./handlers/getCachedDomain";
import { cacheAssetDomain } from "./handlers/cacheAssetDomain";
import { getMemoRequiredAccounts } from "./handlers/getMemoRequiredAccounts";
import { resetExperimentalData } from "./handlers/resetExperimentalData";
import { addTokenId } from "./handlers/addTokenId";
import { getTokenIds } from "./handlers/getTokenIds";
import { removeTokenId } from "./handlers/removeTokenId";
import { getMigratableAccounts } from "./handlers/getMigratableAccounts";
import { getMigratedMnemonicPhrase } from "./handlers/getMigratedMnemonicPhrase";
import { migrateAccounts } from "./handlers/migrateAccounts";
import { addAssetsList } from "./handlers/addAssetsList";
import { modifyAssetsList } from "./handlers/modifyAssetsList";
import { getIsAccountMismatch } from "./handlers/getIsAccountMismatch";
import { changeAssetVisibility } from "./handlers/changeAssetVisibility";
import { getHiddenAssets } from "./handlers/getHiddenAssets";

const numOfPublicKeysToCheck = 5;

export const responseQueue: ResponseQueue<
  | RequestAccessResponse
  | SignTransactionResponse
  | SignBlobResponse
  | SignAuthEntryResponse
  | AddTokenResponse
  | SetAllowedStatusResponse
  | RejectAccessResponse
  | RejectTransactionResponse
  | SignedHwPayloadResponse
> = [];
export const transactionQueue: TransactionQueue = [];
export const tokenQueue: TokenToAdd[] = [];
export const blobQueue: MessageToSign[] = [];
export const authEntryQueue: EntryToSign[] = [];

export const popupMessageListener = (
  request: ServiceMessageRequest,
  sessionStore: Store,
  localStore: DataStorageAccess,
  keyManager: KeyManager,
  sessionTimer: SessionTimer,
) => {
  const currentState = sessionStore.getState();
  const publicKey = publicKeySelector(currentState);

  if (
    request.activePublicKey &&
    request.activePublicKey !== publicKey &&
    request.type !== SERVICE_TYPES.GET_IS_ACCOUNT_MISMATCH
  ) {
    return { error: "Public key does not match active public key" };
  }

  switch (request.type) {
    case SERVICE_TYPES.FUND_ACCOUNT: {
      return fundAccount({ request, localStore });
    }
    case SERVICE_TYPES.CREATE_ACCOUNT: {
      return createAccount({
        request,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      });
    }
    case SERVICE_TYPES.ADD_ACCOUNT: {
      return addAccount({
        request,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      });
    }
    case SERVICE_TYPES.IMPORT_ACCOUNT: {
      return importAccount({
        request,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      });
    }
    case SERVICE_TYPES.IMPORT_HARDWARE_WALLET: {
      return importHardwareWallet({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE: {
      return makeAccountActive({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.UPDATE_ACCOUNT_NAME: {
      return updateAccountName({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.ADD_CUSTOM_NETWORK: {
      return addCustomNetwork({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.REMOVE_CUSTOM_NETWORK: {
      return removeCustomNetwork({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.EDIT_CUSTOM_NETWORK: {
      return editCustomNetwork({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.CHANGE_NETWORK: {
      return changeNetwork({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.LOAD_ACCOUNT: {
      return loadAccount({
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.GET_MNEMONIC_PHRASE: {
      return getMnemonicPhrase({
        request,
        localStore,
        sessionStore,
        keyManager,
      });
    }
    case SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE: {
      return confirmMnemonicPhrase({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE: {
      return confirmMigratedMnemonicPhrase({
        request,
        sessionStore,
      });
    }
    case SERVICE_TYPES.RECOVER_ACCOUNT: {
      return recoverAccount({
        request,
        sessionStore,
        localStore,
        keyManager,
        sessionTimer,
        numOfPublicKeysToCheck,
      });
    }
    case SERVICE_TYPES.SHOW_BACKUP_PHRASE: {
      return showBackupPhrase({
        request,
        sessionStore,
        localStore,
        keyManager,
        sessionTimer,
      });
    }
    case SERVICE_TYPES.CONFIRM_PASSWORD: {
      return confirmPassword({
        request,
        sessionStore,
        localStore,
        keyManager,
        sessionTimer,
      });
    }
    case SERVICE_TYPES.GRANT_ACCESS: {
      return grantAccess({
        request,
        sessionStore,
        localStore,
        responseQueue,
      });
    }
    case SERVICE_TYPES.REJECT_ACCESS: {
      return rejectAccess({
        responseQueue,
      });
    }
    case SERVICE_TYPES.HANDLE_SIGNED_HW_PAYLOAD: {
      return handleSignedHwPayload({
        request,
        responseQueue,
      });
    }
    case SERVICE_TYPES.ADD_TOKEN: {
      return addToken({
        localStore,
        sessionStore,
        tokenQueue,
        responseQueue,
      });
    }
    case SERVICE_TYPES.SIGN_TRANSACTION: {
      return signTransaction({
        localStore,
        sessionStore,
        responseQueue,
        transactionQueue,
      });
    }
    case SERVICE_TYPES.SIGN_BLOB: {
      return signBlob({
        apiVersion: request.apiVersion,
        localStore,
        sessionStore,
        responseQueue,
        blobQueue,
      });
    }
    case SERVICE_TYPES.SIGN_AUTH_ENTRY: {
      return signAuthEntry({
        localStore,
        sessionStore,
        responseQueue,
        authEntryQueue,
      });
    }
    case SERVICE_TYPES.REJECT_TRANSACTION: {
      return rejectTransaction({
        responseQueue,
        transactionQueue,
      });
    }
    case SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION: {
      return signFreighterTransaction({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.SIGN_FREIGHTER_SOROBAN_TRANSACTION: {
      return signFreighterTransaction({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.ADD_RECENT_ADDRESS: {
      return addRecentAddress({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.LOAD_RECENT_ADDRESSES: {
      return loadRecentAddresses({
        localStore,
      });
    }
    case SERVICE_TYPES.LOAD_LAST_USED_ACCOUNT: {
      return loadLastUsedAccount({
        localStore,
      });
    }
    case SERVICE_TYPES.SIGN_OUT: {
      return signOut({
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.SAVE_ALLOWLIST: {
      return saveAllowList({
        request,
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.SAVE_SETTINGS: {
      return saveSettings({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.SAVE_EXPERIMENTAL_FEATURES: {
      return saveExperimentalFeatures({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.LOAD_SETTINGS: {
      return loadSettings({
        localStore,
      });
    }
    case SERVICE_TYPES.GET_CACHED_ASSET_ICON_LIST: {
      return getCachedAssetIconList({
        localStore,
      });
    }
    case SERVICE_TYPES.GET_CACHED_ASSET_ICON: {
      return getCachedAssetIcon({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.CACHE_ASSET_ICON: {
      return cacheAssetIcon({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.GET_CACHED_ASSET_DOMAIN: {
      return getCachedAssetDomain({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.CACHE_ASSET_DOMAIN: {
      return cacheAssetDomain({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.GET_MEMO_REQUIRED_ACCOUNTS: {
      return getMemoRequiredAccounts();
    }
    case SERVICE_TYPES.RESET_EXP_DATA: {
      return resetExperimentalData({
        localStore,
        sessionStore,
      });
    }
    case SERVICE_TYPES.ADD_TOKEN_ID: {
      return addTokenId({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.GET_TOKEN_IDS: {
      return getTokenIds({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.REMOVE_TOKEN_ID: {
      return removeTokenId({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.GET_MIGRATABLE_ACCOUNTS: {
      return getMigratableAccounts({
        localStore,
        sessionStore,
        numOfPublicKeysToCheck,
      });
    }
    case SERVICE_TYPES.GET_MIGRATED_MNEMONIC_PHRASE: {
      return getMigratedMnemonicPhrase({
        sessionStore,
      });
    }
    case SERVICE_TYPES.MIGRATE_ACCOUNTS: {
      return migrateAccounts({
        request,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      });
    }
    case SERVICE_TYPES.ADD_ASSETS_LIST: {
      return addAssetsList({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.MODIFY_ASSETS_LIST: {
      return modifyAssetsList({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.GET_IS_ACCOUNT_MISMATCH: {
      return getIsAccountMismatch({
        request,
        sessionStore,
      });
    }
    case SERVICE_TYPES.CHANGE_ASSET_VISIBILITY: {
      return changeAssetVisibility({
        request,
        localStore,
      });
    }
    case SERVICE_TYPES.GET_HIDDEN_ASSETS: {
      return getHiddenAssets({
        localStore,
      });
    }
    default:
      return { error: "Message type not supported" };
  }
};
