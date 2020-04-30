import { KeyManager, KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import { fromMnemonic, generateMnemonic } from "stellar-hd-wallet";
import { SERVICE_TYPES, APPLICATION_STATE } from "../../src/statics";

const uiData = {
  publicKey: "",
  mnemonicPhrase: "",
  applicationState: "",
};

const initMessageListener = () => {
  chrome.runtime.onMessageExternal.addListener((request, _, sendResponse) => {
    const localKeyStore = new KeyManagerPlugins.MemoryKeyStore();
    const keyManager = new KeyManager({
      keyStore: localKeyStore,
    });
    keyManager.registerEncrypter(KeyManagerPlugins.ScryptEncrypter);

    const _storeAccount = async ({ password, wallet }) => {
      uiData.publicKey = wallet.getPublicKey(0);

      const keyMetadata = {
        key: {
          extra: { mnemonicPhrase: uiData.mnemonicPhrase },
          type: KeyType.plaintextKey,
          publicKey: uiData.publicKey,
          privateKey: wallet.getSecret(0),
        },

        password,
        encrypterName: KeyManagerPlugins.ScryptEncrypter.name,
      };

      try {
        await keyManager.storeKey(keyMetadata);
      } catch (e) {
        console.error(e);
      }

      uiData.applicationState = APPLICATION_STATE.PASSWORD_CREATED;
    };

    const createAccount = () => {
      const { password } = request;

      uiData.mnemonicPhrase = generateMnemonic({ entropyBits: 128 });
      const wallet = fromMnemonic(uiData.mnemonicPhrase);

      _storeAccount({ password, wallet });

      sendResponse({ publicKey: uiData.publicKey });
    };

    const loadAccount = () => {
      sendResponse({
        publicKey: uiData.publicKey,
        applicationState: uiData.applicationState,
      });
    };

    const getMnemonicPhrase = () => {
      sendResponse({ mnemonicPhrase: uiData.mnemonicPhrase });
    };

    const confirmMnemonicPhrase = () => {
      const isCorrectPhrase =
        uiData.mnemonicPhrase === request.mnemonicPhraseToConfirm;

      if (isCorrectPhrase) {
        uiData.applicationState = APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;
      }
      sendResponse({
        isCorrectPhrase,
      });
    };

    const recoverAccount = () => {
      const { password, recoverMnemonic } = request;
      const wallet = fromMnemonic(recoverMnemonic);

      _storeAccount({ password, wallet });

      sendResponse({ publicKey: uiData.publicKey });
    };

    const messageResponder = {
      [SERVICE_TYPES.CREATE_ACCOUNT]: createAccount,
      [SERVICE_TYPES.LOAD_ACCOUNT]: loadAccount,
      [SERVICE_TYPES.GET_MNEMONIC_PHRASE]: getMnemonicPhrase,
      [SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE]: confirmMnemonicPhrase,
      [SERVICE_TYPES.RECOVER_ACCOUNT]: recoverAccount,
    };

    if (messageResponder[request.type]) {
      messageResponder[request.type]();
    }
  });
};

export default initMessageListener;
