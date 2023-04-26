import browser from "webextension-polyfill";

import { ALLOWLIST_ID } from "constants/localStorageTypes";
import { getUrlHostname, getPunycodedDomain } from "helpers/urls";
import {
  dataStorageAccess,
  SESSION_STORAGE_ENABLED,
  browserStorage,
  sessionStorage,
} from "background/helpers/dataStorage";

export const isSenderAllowed = async ({
  sender,
}: {
  sender: browser.Runtime.MessageSender;
}) => {
  const storageApi = SESSION_STORAGE_ENABLED ? sessionStorage : browserStorage;
  const _dataStore = dataStorageAccess(storageApi);
  const allowListStr = (await _dataStore.getItem(ALLOWLIST_ID)) || "";
  const allowList = allowListStr.split(",");

  const { url: tabUrl = "" } = sender;
  const domain = getUrlHostname(tabUrl);

  return allowList.includes(getPunycodedDomain(domain));
};
