import { EXTENSION_ID, SERVICE_TYPES } from "statics";

export const createAccount = async (
  password: string,
): Promise<{ publicKey: string }> => {
  let publicKey = "";

  try {
    ({ publicKey } = await sendMessageAndAwaitResponse({
      password,
      type: SERVICE_TYPES.CREATE_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { publicKey };
};

export const loadAccount = async (): Promise<{
  publicKey: string;
  applicationState: string;
}> => {
  let response = { publicKey: "", applicationState: "" };

  try {
    response = await sendMessageAndAwaitResponse({
      type: SERVICE_TYPES.LOAD_ACCOUNT,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};

export const getMnemonicPhrase = async (): Promise<{
  mnemonicPhrase: string;
}> => {
  let response = { mnemonicPhrase: "" };

  try {
    response = await sendMessageAndAwaitResponse({
      type: SERVICE_TYPES.GET_MNEMONIC_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};

export const confirmMnemonicPhrase = async (
  mnemonicPhraseToConfirm: string,
): Promise<{
  isCorrectPhrase: boolean;
}> => {
  let response = { isCorrectPhrase: false };

  try {
    response = await sendMessageAndAwaitResponse({
      mnemonicPhraseToConfirm,
      type: SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }
  console.log(response);
  return response;
};

export const recoverAccount = async (
  password: string,
  recoverMnemonic: string,
): Promise<{ publicKey: string }> => {
  let publicKey = "";

  try {
    ({ publicKey } = await sendMessageAndAwaitResponse({
      password,
      recoverMnemonic,
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { publicKey };
};

export const sendMessage = (msg: {}) => {
  chrome.runtime.sendMessage(EXTENSION_ID, msg);
};

interface Response {
  applicationState: string;
  publicKey: string;
  mnemonicPhrase: string;
  isCorrectPhrase: boolean;
}

export const sendMessageAndAwaitResponse = (msg: {}): Promise<Response> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(EXTENSION_ID, msg, (res: Response) =>
      resolve(res),
    );
  });
};
