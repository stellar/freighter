import { useSelector } from "react-redux";
import { settingsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { getPunycodedDomain } from "helpers/urls";

export const useIsDomainListedAllowed = ({ domain }: { domain: string }) => {
  const { allowList, networkDetails } = useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);

  const allowlistByKey =
    allowList?.[networkDetails.networkName]?.[publicKey] || [];

  // Convert domain to punycode before checking, since domains are stored as punycode
  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainListedAllowed = allowlistByKey.includes(punycodedDomain);

  return { isDomainListedAllowed };
};
