import { captureException } from "@sentry/browser";
import { LedgerKeyAccount } from "../types";
import { NetworkDetails } from "../../constants/stellar";
import { INDEXER_V2_URL } from "../../constants/mercury";

export const getDomainFromIssuer = async ({
  assetInfoList,
  networkDetails,
}: {
  assetInfoList: string[];
  networkDetails: NetworkDetails;
}) => {
  const fetchedAssetDomains = {} as { [code: string]: string };

  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_keys: assetInfoList,
      }),
    };
    const url = new URL(`${INDEXER_V2_URL}/ledger-key/accounts`);
    url.searchParams.append("network", networkDetails.network);
    const response = await fetch(url, options);
    const { data } = (await response.json()) as { data: LedgerKeyAccount };

    Object.entries(data.ledger_key_accounts).forEach(([key, value]) => {
      fetchedAssetDomains[key] = value.home_domain;
    });
  } catch (e) {
    captureException(`Error fetching asset domains: ${e}`);
  }

  return fetchedAssetDomains;
};
