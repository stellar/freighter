import { DataProvider } from "@stellar/wallet-sdk";
import { Account, AccountDetailsInterface, Balances } from "./types";
import { NETWORK_PASSPHRASE, NETWORK_URL } from "../constants/stellar";
import { SERVICE_TYPES } from "../constants/services";
import { APPLICATION_STATE } from "../constants/applicationState";
import { sendMessageToBackground, getIconUrlFromIssuer } from "./helpers";

const TRANSACTIONS_LIMIT = 15;

export const createAccount = async (
  password: string,
): Promise<{ publicKey: string; allAccounts: Array<Account> }> => {
  let publicKey = "";
  let allAccounts = [] as Array<Account>;

  try {
    ({ allAccounts, publicKey } = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.CREATE_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { allAccounts, publicKey };
};

export const addAccount = async (
  password: string,
): Promise<{ publicKey: string; allAccounts: Array<Account> }> => {
  let error = "";
  let publicKey = "";
  let allAccounts = [] as Array<Account>;

  try {
    ({ allAccounts, error, publicKey } = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.ADD_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  if (error) {
    throw new Error(error);
  }

  return { allAccounts, publicKey };
};

export const importAccount = async (
  password: string,
  privateKey: string,
): Promise<{ publicKey: string; allAccounts: Array<Account> }> => {
  let error = "";
  let publicKey = "";
  let allAccounts = [] as Array<Account>;

  try {
    ({ allAccounts, publicKey, error } = await sendMessageToBackground({
      password,
      privateKey,
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  // @TODO: should this be universal? See asana ticket.
  if (error) {
    throw new Error(error);
  }

  return { allAccounts, publicKey };
};

export const makeAccountActive = (
  publicKey: string,
): Promise<{ publicKey: string; hasPrivateKey: boolean }> =>
  sendMessageToBackground({
    publicKey,
    type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
  });

export const updateAccountName = (
  accountName: string,
): Promise<{ allAccounts: Array<Account> }> =>
  sendMessageToBackground({
    accountName,
    type: SERVICE_TYPES.UPDATE_ACCOUNT_NAME,
  });

export const loadAccount = (): Promise<{
  hasPrivateKey: boolean;
  publicKey: string;
  applicationState: APPLICATION_STATE;
  allAccounts: Array<Account>;
}> =>
  sendMessageToBackground({
    type: SERVICE_TYPES.LOAD_ACCOUNT,
  });

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
): Promise<{ publicKey: string; allAccounts: Array<Account> }> => {
  let publicKey = "";
  let allAccounts = [] as Array<Account>;

  try {
    ({ allAccounts, publicKey } = await sendMessageToBackground({
      password,
      recoverMnemonic,
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { allAccounts, publicKey };
};

export const confirmPassword = async (
  password: string,
): Promise<{
  publicKey: string;
  hasPrivateKey: boolean;
  applicationState: APPLICATION_STATE;
  allAccounts: Array<Account>;
}> => {
  let response = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [] as Array<Account>,
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

export const getAccountDetails = async (
  publicKey: string,
): Promise<AccountDetailsInterface> => {
  const dataProvider = new DataProvider({
    serverUrl: NETWORK_URL,
    accountOrKey: publicKey,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  let payments = null;
  let balances = null;
  let isFunded = null;

  try {
    ({ balances } = await dataProvider.fetchAccountDetails());
    const transactionData = await dataProvider.fetchPayments({
      limit: TRANSACTIONS_LIMIT,
    });
    payments = transactionData?.records || null;
  } catch (e) {
    console.error(e);
  }

  try {
    isFunded = await dataProvider.isAccountFunded();
  } catch (e) {
    isFunded = false;
    console.error(e);
  }

  return {
    balances,
    isFunded,
    payments,
  };
};

export const getAssetIcons = async (balances: Balances) => {
  const assetIcons = {} as { [code: string]: string };

  if (balances) {
    let icon = "";
    const balanceValues = Object.values(balances);
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < balanceValues.length; i++) {
      const { token } = balanceValues[i];
      if ("issuer" in token) {
        const {
          issuer: { key },
          code,
        } = token;
        // eslint-disable-next-line no-await-in-loop
        icon = await getIconUrlFromIssuer({ key, code });
        assetIcons[code] = icon;
      }
    }
  }
  return assetIcons;
};

export const getAssetIcon = async ({
  key,
  code,
  assetIcons,
}: {
  key: string;
  code: string;
  assetIcons: { [code: string]: string };
}) => {
  const newAssetIcons = { ...assetIcons };
  try {
    await sendMessageToBackground({
      assetCode: code,
      iconUrl: null,
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
    });
  } catch (e) {
    return assetIcons;
  }
  const icon = await getIconUrlFromIssuer({ key, code });
  newAssetIcons[code] = icon;
  return newAssetIcons;
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

export const showBackupPhrase = async (
  password: string,
): Promise<{ error: string }> => {
  let response = { error: "" };
  try {
    response = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.SHOW_BACKUP_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const saveSettings = async (
  isDataSharingAllowed: boolean,
): Promise<{ isDataSharingAllowed: boolean }> => {
  let response = { isDataSharingAllowed: false };

  try {
    response = await sendMessageToBackground({
      isDataSharingAllowed,
      type: SERVICE_TYPES.SAVE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const loadSettings = (): Promise<{
  isDataSharingAllowed: boolean;
}> =>
  sendMessageToBackground({
    type: SERVICE_TYPES.LOAD_SETTINGS,
  });
