import { captureException } from "@sentry/browser";

import { LedgerKeyAccounts, LedgerKeyAccount } from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { fetchBackendV2 } from "./fetchBackendV2";

export const getLedgerKeyAccounts = async ({
  accountList,
  networkDetails,
}: {
  accountList: string[];
  networkDetails: NetworkDetails;
}) => {
  let fetchedAccounts = {} as { [code: string]: LedgerKeyAccount };

  try {
    const { status, body } = await fetchBackendV2({
      method: "POST",
      path: `/ledger-key/accounts?network=${networkDetails.network}`,
      body: JSON.stringify({ public_keys: accountList }),
    });

    if (status !== 200) {
      captureException(
        `Failed to fetch ledger key accounts - ${status}: ${JSON.stringify(body)}`,
      );
      return fetchedAccounts;
    }

    const { data } = body as { data: LedgerKeyAccounts };
    fetchedAccounts = data.ledger_key_accounts;
  } catch (e) {
    captureException(`Error fetching ledger key accounts: ${e}`);
  }

  return fetchedAccounts;
};
