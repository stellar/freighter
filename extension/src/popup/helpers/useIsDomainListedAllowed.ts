/* eslint-disable */
import { useSelector } from "react-redux";
import { settingsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";

export const useIsDomainListedAllowed = ({ domain }: { domain: string }) => {
  const { allowList, networkDetails } = useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);

  const allowlistByKey =
    allowList?.[networkDetails.networkName]?.[publicKey] || [];

  const isDomainListedAllowed = allowlistByKey.includes(domain);

  return { isDomainListedAllowed };
};
