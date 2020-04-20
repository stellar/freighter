import { EXTENSION_ID, SERVICE_TYPES } from "statics";
import { KeyManagerPlugins, KeyType } from "@stellar/wallet-sdk";
import StellarSdk from "stellar-sdk";

export const createAccount = async (
  password: string,
): Promise<{ publicKey: string }> => {
  const pair = StellarSdk.Keypair.random();

  try {
    await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(
        pair.publicKey(),
      )}`,
    );
  } catch (e) {
    console.error("ERROR!", e);
  }

  const publicKey = pair.publicKey() || "";

  const keyMetadata = {
    key: {
      type: KeyType.plaintextKey,
      publicKey,
      privateKey: pair.secret(),
    },

    password,
    encrypterName: KeyManagerPlugins.ScryptEncrypter.name,
  };

  sendMessage({ keyMetadata, type: SERVICE_TYPES.CREATE_ACCOUNT });

  return { publicKey };
};

export const loadAccount = async (): Promise<{ publicKey: string }> => {
  let response = { publicKey: "" };

  try {
    response = await sendMessageAndAwaitResponse({
      type: SERVICE_TYPES.LOAD_ACCOUNT,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const sendMessage = (msg: {}) => {
  chrome.runtime.sendMessage(EXTENSION_ID, msg);
};

export const sendMessageAndAwaitResponse = (msg: {}) => {
  return new Promise<{ publicKey: string }>((resolve) => {
    chrome.runtime.sendMessage(EXTENSION_ID, msg, (res) => resolve(res));
  });
};
