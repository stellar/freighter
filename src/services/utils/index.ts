import { DEVELOPMENT, EXTENSION_ID } from "statics";

interface Response {
  applicationState: string;
  publicKey: string;
  mnemonicPhrase: string;
  isCorrectPhrase: boolean;
  confirmedPassword: boolean;
  transactionStatus: string;
  error: string;
}

export const sendMessageAndAwaitResponseExternal = (msg: {}): Promise<Response> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(EXTENSION_ID, msg, (res: Response) =>
      resolve(res),
    );
  });

export const sendMessageAndAwaitResponseInternal = (msg: {}): Promise<Response> =>
  new Promise((resolve) => {
    if (DEVELOPMENT) {
      chrome.runtime.sendMessage(EXTENSION_ID, msg, (res: Response) =>
        resolve(res),
      );
    } else {
      chrome.runtime.sendMessage(msg, (res: Response) => resolve(res));
    }
  });
