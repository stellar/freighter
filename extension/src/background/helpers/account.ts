import {
  ACCOUNT_NAME_LIST_ID,
  KEY_ID_LIST,
  KEY_ID,
  IS_TESTNET_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
} from "constants/localStorageTypes";
import { decodeString, encodeObject } from "helpers/urls";

export const getKeyIdList = () =>
  JSON.parse(localStorage.getItem(KEY_ID_LIST) || "[]");

export const getAccountNameList = () => {
  const encodedaccountNameList =
    localStorage.getItem(ACCOUNT_NAME_LIST_ID) || encodeObject({});

  return JSON.parse(decodeString(encodedaccountNameList));
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

  const encodedaccountNameList = encodeObject(accountNameList);

  localStorage.setItem(ACCOUNT_NAME_LIST_ID, encodedaccountNameList);
};

export const getIsTestnet = () =>
  JSON.parse(localStorage.getItem(IS_TESTNET_ID) || "false");

export const getIsMemoValidationEnabled = () =>
  JSON.parse(localStorage.getItem(IS_VALIDATING_MEMO_ID) || "true");

export const getIsSafetyValidationEnabled = () =>
  JSON.parse(localStorage.getItem(IS_VALIDATING_SAFETY_ID) || "true");

// hardware wallet helpers
export const HW_PREFIX = "hw:";

export const getIsHardwareWalletActive = () =>
  (localStorage.getItem(KEY_ID) || "").indexOf(HW_PREFIX) > -1;

export const getBipPath = () => {
  const keyId = localStorage.getItem(KEY_ID) || "";
  const hwData = JSON.parse(localStorage.getItem(keyId) || "{}");
  return hwData.bipPath || "";
};
