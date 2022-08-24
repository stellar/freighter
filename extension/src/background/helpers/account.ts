import {
  ACCOUNT_NAME_LIST_ID,
  KEY_ID_LIST,
  KEY_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";
import { DEFAULT_NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { decodeString, encodeObject } from "helpers/urls";
import { isMainnet, isTestnet } from "helpers/stellar";

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

export const getIsMainnet = () => {
  const networkDetails = getNetworkDetails();

  return isMainnet(networkDetails);
};

export const getIsTestnet = () => {
  const networkDetails = getNetworkDetails();

  return isTestnet(networkDetails);
};

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

export const getSavedNetworks = () =>
  JSON.parse(
    localStorage.getItem(NETWORKS_LIST_ID) || JSON.stringify(DEFAULT_NETWORKS),
  ) as NetworkDetails[];

export const getNetworkDetails = () => {
  const networkDetails = JSON.parse(
    localStorage.getItem(NETWORK_ID) || JSON.stringify(DEFAULT_NETWORKS[0]),
  ) as NetworkDetails;

  return networkDetails;
};

export const getNetworksList = () => {
  const networksList = JSON.parse(
    localStorage.getItem(NETWORKS_LIST_ID) || JSON.stringify(DEFAULT_NETWORKS),
  ) as NetworkDetails[];

  return networksList;
};
