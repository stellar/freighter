import { ACCOUNT_NAME_LIST_ID, KEY_ID_LIST } from "constants/localStorageTypes";

export const getKeyIdList = () =>
  JSON.parse(localStorage.getItem(KEY_ID_LIST) || "[]");

export const getAccountNameList = () =>
  JSON.parse(localStorage.getItem(ACCOUNT_NAME_LIST_ID) || "{}");

export const addAccountName = ({
  keyId,
  accountName,
}: {
  keyId: string;
  accountName: string;
}) => {
  const accountNameList = getAccountNameList();

  accountNameList[keyId] = accountName;

  localStorage.setItem(ACCOUNT_NAME_LIST_ID, JSON.stringify(accountNameList));
};
