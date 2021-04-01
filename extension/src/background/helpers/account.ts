import {
  ACCOUNT_NAME_LIST_ID,
  KEY_ID_LIST,
  IS_TESTNET_ID,
} from "constants/localStorageTypes";

export const getKeyIdList = () =>
  JSON.parse(localStorage.getItem(KEY_ID_LIST) || "[]");

export const getAccountNameList = () => {
  const encodedaccountNameList =
    localStorage.getItem(ACCOUNT_NAME_LIST_ID) || btoa("{}");

  return JSON.parse(atob(encodedaccountNameList));
};

export const addAccountName = ({
  keyId,
  accountName,
}: {
  keyId: string;
  accountName: string;
}) => {
  const accountNameList = getAccountNameList();

  accountNameList[keyId] = accountName;

  const encodedaccountNameList = btoa(JSON.stringify(accountNameList));

  localStorage.setItem(ACCOUNT_NAME_LIST_ID, encodedaccountNameList);
};

export const getIsTestnet = () =>
  JSON.parse(localStorage.getItem(IS_TESTNET_ID) || "false");
