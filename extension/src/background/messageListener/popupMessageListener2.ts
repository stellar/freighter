import { Store } from "redux";
import {
  ResponseQueue,
  ServiceMessageRequest,
  TransactionQueue,
} from "@shared/api/types/message-request";
import { SERVICE_TYPES } from "@shared/constants/services";
import {
  browserLocalStorage,
  dataStorageAccess,
} from "background/helpers/dataStorageAccess";
import {
  BrowserStorageKeyStore,
  KeyManager,
  ScryptEncrypter,
} from "@stellar/typescript-wallet-sdk-km";
import { BrowserStorageConfigParams } from "@stellar/typescript-wallet-sdk-km/lib/Plugins/BrowserStorageFacade";
import { fundAccount } from "./handlers/fund-account";
import { createAccount } from "./handlers/create-account";
import { SessionTimer } from "background/helpers/session";
import { addAccount } from "./handlers/add-account";
import { importAccount } from "./handlers/import-account";
import { publicKeySelector } from "background/ducks/session";
import { importHardwareWallet } from "./handlers/import-hardware-wallet";
import { makeAccountActive } from "./handlers/make-account-active";
import { updateAccountName } from "./handlers/update-account-name";
import { addCustomNetwork } from "./handlers/add-custom-network";
import { removeCustomNetwork } from "./handlers/remove-custom-network";
import { editCustomNetwork } from "./handlers/edit-custom-network";
import { changeNetwork } from "./handlers/change-network";
import { loadAccount } from "./handlers/load-account";
import { getMnemonicPhrase } from "./handlers/get-mnemonic-phrase";
import { confirmMnemonicPhrase } from "./handlers/confirm-mnemonic-phrase";
import { confirmMigratedMnemonicPhrase } from "./handlers/confirm-migrated-mnemonic-phrase";
import { recoverAccount } from "./handlers/recover-account";
import { showBackupPhrase } from "./handlers/show-backup-phrase";
import { confirmPassword } from "./handlers/confirm-password";
import { grantAccess } from "./handlers/grant-access";
import { rejectAccess } from "./handlers/reject-access";
import { handleSignedHwPayload } from "./handlers/handle-signed-hw-payload";
import { EntryToSign, MessageToSign, TokenToAdd } from "helpers/urls";
import { addToken } from "./handlers/add-token";
import { signTransaction } from "./handlers/sign-transaction";
import { signBlob } from "./handlers/sign-blob";
import { signAuthEntry } from "./handlers/sign-auth-entry";
import { rejectTransaction } from "./handlers/reject-transaction";
import { signFreighterTransaction } from "./handlers/sign-freighter-transaction";
import { addRecentAddress } from "./handlers/add-recent-address";
import { loadRecentAddresses } from "./handlers/load-recent-addresses";
import { loadLastUsedAccount } from "./handlers/load-last-account-used";
import { signOut } from "./handlers/sign-out";
import { saveAllowList } from "./handlers/save-allow-list";
import { saveSettings } from "./handlers/save-settings";
import { saveExperimentalFeatures } from "./handlers/save-experimental-features";

const sessionTimer = new SessionTimer();
const numOfPublicKeysToCheck = 5;

export const responseQueue: ResponseQueue = [];

export const transactionQueue: TransactionQueue = [];

export const tokenQueue: TokenToAdd[] = [];

export const blobQueue: MessageToSign[] = [];

export const authEntryQueue: EntryToSign[] = [];

export const popupMessageListener = (
  request: ServiceMessageRequest,
  sessionStore: Store,
) => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const localKeyStore = new BrowserStorageKeyStore();
  localKeyStore.configure({
    storage: browserLocalStorage as BrowserStorageConfigParams["storage"],
  });
  const keyManager = new KeyManager({
    keyStore: localKeyStore,
  });
  keyManager.registerEncrypter(ScryptEncrypter);

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
      return fundAccount({ request });
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
    default:
      return { error: "Message type not supported" };
  }
};
