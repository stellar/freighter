import { KeyManager, KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import StellarSdk from "stellar-sdk";
// @ts-ignore
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";
import { SERVICE_TYPES, APPLICATION_STATE, SERVER_URL } from "statics";
import { Response as Request } from "api/types";
import { removeQueryParam } from "helpers";
import { Sender, SendResponseInterface } from "../types";
import {
  hasPrivateKeySelector,
  privateKeySelector,
  store,
  logIn,
  logOut,
  mnemonicPhraseSelector,
  publicKeySelector,
} from "../ducks/session";
import { SessionTimer } from "../helpers/session";

const server = new StellarSdk.Server(SERVER_URL);

const KEY_ID = "keyId";
const WHITELIST_ID = "whitelist";
const APPLICATION_ID = "applicationState";

const sessionTimer = new SessionTimer();

export const responseQueue: Array<(message?: any) => void> = [];
export const transactionQueue: Array<{ sign: (sourceKeys: {}) => void }> = [];

interface StellarHdWallet {
  getPublicKey: (number: Number) => string;
  getSecret: (number: Number) => string;
}

export const popupMessageListener = (
  request: Request,
  _: Sender,
  sendResponse: (response: SendResponseInterface) => void,
) => {
  const localKeyStore = new KeyManagerPlugins.LocalStorageKeyStore();
  localKeyStore.configure({ storage: localStorage });
  const keyManager = new KeyManager({
    keyStore: localKeyStore,
  });
  keyManager.registerEncrypter(KeyManagerPlugins.ScryptEncrypter);

  const _storeAccount = async ({
    mnemonicPhrase,
    password,
    wallet,
  }: {
    mnemonicPhrase: string;
    password: string;
    wallet: StellarHdWallet;
  }) => {
    const publicKey = wallet.getPublicKey(0);
    const privateKey = wallet.getSecret(0);

    store.dispatch(logIn({ publicKey, mnemonicPhrase }));

    const keyMetadata = {
      key: {
        extra: { mnemonicPhrase },
        type: KeyType.plaintextKey,
        publicKey,
        privateKey,
      },

      password,
      encrypterName: KeyManagerPlugins.ScryptEncrypter.name,
    };

    let keyStore = { id: "" };

    try {
      keyStore = await keyManager.storeKey(keyMetadata);
    } catch (e) {
      console.error(e);
    }

    localStorage.setItem(KEY_ID, keyStore.id);
  };

  const createAccount = async () => {
    const { password } = request;

    const mnemonicPhrase = generateMnemonic({ entropyBits: 128 });
    const wallet = fromMnemonic(mnemonicPhrase);

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(
          wallet.getPublicKey(0),
        )}`,
      );
      const responseJSON = await response.json();
      console.log("SUCCESS! You have a new account :)\n", responseJSON);
    } catch (e) {
      console.error(e);
      throw new Error("Error creating account");
    }

    await _storeAccount({
      password,
      wallet,
      mnemonicPhrase,
    });
    localStorage.setItem(APPLICATION_ID, APPLICATION_STATE.PASSWORD_CREATED);

    sendResponse({ publicKey: publicKeySelector(store.getState()) });
  };

  const loadAccount = () => {
    sendResponse({
      hasPrivateKey: hasPrivateKeySelector(store.getState()),
      publicKey: publicKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    });
  };

  const getMnemonicPhrase = () => {
    sendResponse({ mnemonicPhrase: mnemonicPhraseSelector(store.getState()) });
  };

  const confirmMnemonicPhrase = () => {
    const isCorrectPhrase =
      mnemonicPhraseSelector(store.getState()) ===
      request.mnemonicPhraseToConfirm;

    const applicationState = isCorrectPhrase
      ? APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED
      : APPLICATION_STATE.MNEMONIC_PHRASE_FAILED;

    localStorage.setItem(APPLICATION_ID, applicationState);

    sendResponse({
      isCorrectPhrase,
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    });
  };

  const recoverAccount = () => {
    const { password, recoverMnemonic } = request;
    let wallet;
    let applicationState;
    try {
      wallet = fromMnemonic(recoverMnemonic);
    } catch (e) {
      console.error(e);
    }

    if (wallet) {
      _storeAccount({ mnemonicPhrase: recoverMnemonic, password, wallet });

      // if we don't have an application state, assign them one
      applicationState =
        localStorage.getItem(APPLICATION_ID) ||
        APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

      localStorage.setItem(APPLICATION_ID, applicationState);
    }

    sendResponse({
      publicKey: publicKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    });
  };

  const confirmPassword = async () => {
    const { password } = request;
    let keyStore;
    try {
      keyStore = await keyManager.loadKey(
        localStorage.getItem(KEY_ID) || "",
        password,
      );
    } catch (e) {
      console.error(e);
    }
    let publicKey = "";
    let privateKey = "";
    if (keyStore) {
      ({ privateKey, publicKey } = keyStore);
      store.dispatch(logIn({ publicKey }));
      sessionTimer.startSession({ privateKey });
    }

    sendResponse({
      publicKey: publicKeySelector(store.getState()),
      hasPrivateKey: hasPrivateKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    });
  };

  const grantAccess = () => {
    const { url = "" } = request;
    const sanitizedUrl = removeQueryParam(url);

    // TODO: right now we're just grabbing the last thing in the queue, but this should be smarter.
    // Maybe we need to search through responses to find a matching reponse :thinking_face
    const response = responseQueue.pop();
    const whitelistStr = localStorage.getItem(WHITELIST_ID) || "";
    const whitelist = whitelistStr.split(",");
    whitelist.push(sanitizedUrl);

    localStorage.setItem(WHITELIST_ID, whitelist.join());

    if (typeof response === "function") {
      response(url);
      sendResponse({});
    } else {
      sendResponse({ error: "Access was denied" });
    }
  };

  const rejectAccess = () => {
    const response = responseQueue.pop();
    if (response) {
      response();
    }
  };

  const signTransaction = async () => {
    const privateKey = privateKeySelector(store.getState());
    if (privateKey.length) {
      const sourceKeys = StellarSdk.Keypair.fromSecret(privateKey);

      let response;

      const transactionToSign = transactionQueue.pop();

      if (transactionToSign) {
        try {
          transactionToSign.sign(sourceKeys);
          response = await server.submitTransaction(transactionToSign);
        } catch (e) {
          response = e;
          console.error(e);
        }
      }

      const transactionResponse = responseQueue.pop();
      if (typeof transactionResponse === "function") {
        transactionResponse(response);
        sendResponse({});
      }
    } else {
      sendResponse({ error: "Session timed out" });
    }
  };

  const rejectTransaction = () => {
    transactionQueue.pop();
    const response = responseQueue.pop();
    if (response) {
      response();
    }
  };

  const signOut = () => {
    store.dispatch(logOut());

    sendResponse({
      publicKey: publicKeySelector(store.getState()),
      applicationState: localStorage.getItem(APPLICATION_ID) || "",
    });
  };

  const messageResponder = {
    [SERVICE_TYPES.CREATE_ACCOUNT]: createAccount,
    [SERVICE_TYPES.LOAD_ACCOUNT]: loadAccount,
    [SERVICE_TYPES.GET_MNEMONIC_PHRASE]: getMnemonicPhrase,
    [SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE]: confirmMnemonicPhrase,
    [SERVICE_TYPES.RECOVER_ACCOUNT]: recoverAccount,
    [SERVICE_TYPES.CONFIRM_PASSWORD]: confirmPassword,
    [SERVICE_TYPES.GRANT_ACCESS]: grantAccess,
    [SERVICE_TYPES.REJECT_ACCESS]: rejectAccess,
    [SERVICE_TYPES.SIGN_TRANSACTION]: signTransaction,
    [SERVICE_TYPES.REJECT_TRANSACTION]: rejectTransaction,
    [SERVICE_TYPES.SIGN_OUT]: signOut,
  };

  if (messageResponder[request.type]) {
    messageResponder[request.type]();
  }
};
