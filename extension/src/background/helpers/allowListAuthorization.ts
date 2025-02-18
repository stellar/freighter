import browser from "webextension-polyfill";

import { getUrlHostname, getPunycodedDomain } from "helpers/urls";

export const isSenderAllowed = ({
  sender,
  allowListSegment,
}: {
  sender: browser.Runtime.MessageSender;
  allowListSegment: string[];
}) => {
  const { url: tabUrl = "" } = sender;
  const domain = getUrlHostname(tabUrl);

  return allowListSegment.includes(getPunycodedDomain(domain));
};
