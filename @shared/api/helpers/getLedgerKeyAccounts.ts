import { captureException } from "@sentry/browser";

import { LedgerKeyAccounts, LedgerKeyAccount } from "../types";
import { NetworkDetails } from "@shared/constants/stellar";
import { SERVICE_TYPES } from "@shared/constants/services";
import { sendMessageToBackground } from "./extensionMessaging";

export const getLedgerKeyAccounts = async ({
  accountList,
  networkDetails,
}: {
  accountList: string[];
  networkDetails: NetworkDetails;
}) => {
  let fetchedAccounts = {} as { [code: string]: LedgerKeyAccount };

  try {
    const { status, body } = await sendMessageToBackground({
      type: SERVICE_TYPES.FETCH_BACKEND_V2,
      activePublicKey: null,
      method: "POST",
      path: `/ledger-key/accounts?network=${networkDetails.network}`,
      body: JSON.stringify({ public_keys: accountList }),
    });

    if (status !== 200) {
      captureException(`Failed to fetch ledger key accounts - ${status}`);
      return fetchedAccounts;
    }

    const { data } = body as { data: LedgerKeyAccounts };
    fetchedAccounts = data.ledger_key_accounts;
  } catch (e) {
    captureException(`Error fetching ledger key accounts: ${e}`);
  }

  return fetchedAccounts;
};
