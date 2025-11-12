import { captureException } from "@sentry/browser";
import { LedgerKeyAccounts, LedgerKeyAccount } from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { INDEXER_V2_URL } from "@shared/constants/mercury";

export const getLedgerKeyAccounts = async ({
  accountList,
  networkDetails,
}: {
  accountList: string[];
  networkDetails: NetworkDetails;
}) => {
  let fetchedAccounts = {} as { [code: string]: LedgerKeyAccount };

  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        public_keys: accountList,
      }),
    };
    const url = new URL(`${INDEXER_V2_URL}/ledger-key/accounts`);
    url.searchParams.append("network", networkDetails.network);
    const response = await fetch(url, options);
    if (!response.ok) {
      const _err = JSON.stringify(response);
      captureException(
        `Failed to fetch ledger key accounts - ${response.status}: ${response.statusText}`,
      );

      throw new Error(_err);
    }
    const { data } = (await response.json()) as { data: LedgerKeyAccounts };

    fetchedAccounts = data.ledger_key_accounts;
  } catch (e) {
    captureException(`Error fetching ledger key accounts: ${e}`);
  }

  return fetchedAccounts;
};
