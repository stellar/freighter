import StellarSdk from "stellar-sdk";

import {
  EXTENSION_ID,
  SERVER_URL,
  SERVICE_TYPES,
  DEVELOPMENT,
  APPLICATION_STATE,
} from "statics";
import { Response } from "./types";

const server = new StellarSdk.Server(SERVER_URL);

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
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    publicKey: "",
    applicationState: APPLICATION_STATE.APPLICATION_STARTED,
  };

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
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    isCorrectPhrase: false,
    applicationState: APPLICATION_STATE.PASSWORD_CREATED,
  };

  try {
    response = await sendMessageAndAwaitResponse({
      mnemonicPhraseToConfirm,
      type: SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }
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

export const confirmPassword = async (
  password: string,
): Promise<{ publicKey: string; applicationState: APPLICATION_STATE }> => {
  let response = {
    publicKey: "",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    response = await sendMessageAndAwaitResponse({
      password,
      type: SERVICE_TYPES.CONFIRM_PASSWORD,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const getAccountBalance = async (
  publicKey: string,
): Promise<{
  balance: string;
}> => {
  let response = { balances: [] };

  try {
    response = await server.loadAccount(publicKey);
  } catch (e) {
    console.error(e);
  }
  console.log(response);
  return response.balances[0];
};

export const getPublicKey = async (): Promise<{ publicKey: string }> => {
  let publicKey = "";

  try {
    ({ publicKey } = await sendMessageAndAwaitResponsePublic({
      type: SERVICE_TYPES.LOAD_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }
  return { publicKey };
};

export const rejectAccess = async (): Promise<void> => {
  try {
    await sendMessageAndAwaitResponse({
      type: SERVICE_TYPES.REJECT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const grantAccess = async (url: string): Promise<void> => {
  try {
    await sendMessageAndAwaitResponse({
      url,
      type: SERVICE_TYPES.GRANT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signTransaction = async ({
  password,
  transaction,
}: {
  password: string;
  transaction: {};
}): Promise<void> => {
  try {
    await sendMessageAndAwaitResponse({
      password,
      transaction,
      type: SERVICE_TYPES.SIGN_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
};

export const sendMessageAndAwaitResponse = (msg: {}): Promise<Response> => {
  return new Promise((resolve) => {
    if (DEVELOPMENT) {
      chrome.runtime.sendMessage(EXTENSION_ID, msg, (res: Response) =>
        resolve(res),
      );
    } else {
      chrome.runtime.sendMessage(msg, (res: Response) => resolve(res));
    }
  });
};

export const sendMessageAndAwaitResponsePublic = (msg: {}): Promise<Response> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(EXTENSION_ID, msg, (res: Response) =>
      resolve(res),
    );
  });
};
