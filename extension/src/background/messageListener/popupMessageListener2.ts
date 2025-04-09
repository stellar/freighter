import { Store } from "redux";
import { ServiceMessageRequest } from "@shared/api/types/message-request";
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

const sessionTimer = new SessionTimer();

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
    default:
      return { error: "Message type not supported" };
  }
};
