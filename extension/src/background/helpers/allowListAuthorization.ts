import { Runtime } from "webextension-polyfill-ts";

import { ALLOWLIST_ID } from "constants/localStorageTypes";
import { getUrlHostname, getPunycodedDomain } from "helpers/urls";

export const isSenderAllowed = ({
  sender,
}: {
  sender: Runtime.MessageSender;
}) => {
  const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
  const allowList = allowListStr.split(",");

  const { url: tabUrl = "" } = sender;
  const domain = getUrlHostname(tabUrl);

  return allowList.includes(getPunycodedDomain(domain));
};
