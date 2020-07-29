import StellarSdk from "stellar-sdk";

import { SERVER_URL } from "@lyra/constants/stellar";
import { SERVICE_TYPES } from "@lyra/constants/services";
import { APPLICATION_STATE } from "@lyra/constants/applicationState";
import { sendMessageToBackground } from "./helpers";

const server = new StellarSdk.Server(SERVER_URL);

export const createAccount = async (
  password: string,
): Promise<{ publicKey: string }> => {
  let publicKey = "";

  try {
    ({ publicKey } = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.CREATE_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { publicKey };
};

export const loadAccount = async (): Promise<{
  hasPrivateKey: boolean;
  publicKey: string;
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    hasPrivateKey: false,
    publicKey: "",
    applicationState: APPLICATION_STATE.APPLICATION_STARTED,
  };

  try {
    response = await sendMessageToBackground({
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
    response = await sendMessageToBackground({
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
    response = await sendMessageToBackground({
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
    ({ publicKey } = await sendMessageToBackground({
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
): Promise<{
  publicKey: string;
  hasPrivateKey: boolean;
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    response = await sendMessageToBackground({
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
  return response.balances.filter(
    // eslint-disable-next-line camelcase
    (balance: { asset_code?: string }) => !balance.asset_code,
  )[0];
};

export const rejectAccess = async (): Promise<void> => {
  try {
    await sendMessageToBackground({
      type: SERVICE_TYPES.REJECT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const grantAccess = async (url: string): Promise<void> => {
  try {
    await sendMessageToBackground({
      url,
      type: SERVICE_TYPES.GRANT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signTransaction = async ({
  transaction,
}: {
  transaction: {};
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      transaction,
      type: SERVICE_TYPES.SIGN_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signOut = async (): Promise<{
  publicKey: string;
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    publicKey: "",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    response = await sendMessageToBackground({
      type: SERVICE_TYPES.SIGN_OUT,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};
