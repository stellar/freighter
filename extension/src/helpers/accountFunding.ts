import BigNumber from "bignumber.js";
import { captureException } from "@sentry/browser";

import { store } from "popup/App";
import { Account, ApiTokenPrices } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { AccountBalancesInterface } from "@shared/api/types/backend-api";
import { isNativeBalance } from "@shared/helpers/assetIdentity";
import { NetworkDetails } from "@shared/constants/stellar";
import { isMainnet } from "helpers/stellar";
import {
  emitMetric,
  FUNDING_NETWORK,
  getFundingRecord,
  saveFundingRecord,
  syncIdentifyTraits,
} from "helpers/metrics";
import { getTotalInWholeUnits, getTotalUsd } from "popup/helpers/balance";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

/** The canonical id of XLM in the price map. */
const NATIVE_PRICE_ID = "native";

/** The balance and price data of one account, as the client holds it. */
export interface AccountValueInput {
  /** `isFunded` from the balance response. `false` means no ledger entry. */
  isFunded: AccountBalancesInterface["isFunded"];
  /** The balances without hidden assets, as the USD total uses them. */
  balances: AssetType[];
  /**
   * The prices. `null` means that the price fetch failed. `undefined` means
   * that no price fetch ran.
   */
  tokenPrices: ApiTokenPrices | null | undefined;
  /** The balance fetch failed, or returned only part of the balances. */
  hasBalanceError: boolean;
}

/**
 * Decides funded or unfunded from the USD value of an account.
 * @returns `true` (funded), `false` (unfunded), or `null` when the data gives
 * no definite result.
 */
export const toFunded = ({
  isFunded,
  balances,
  tokenPrices,
  hasBalanceError,
}: AccountValueInput): boolean | null => {
  // Rule 1: no ledger entry, so no balances and no value.
  if (isFunded === false) {
    return false;
  }
  // Rule 2: the balance data is not complete.
  if (hasBalanceError || isFunded === null || isFunded === undefined) {
    return null;
  }
  // Rule 3: the price fetch failed, or did not run.
  if (!tokenPrices) {
    return null;
  }
  // Rule 4: XLM always has a price on mainnet. A missing XLM price means that
  // the price data is not complete, not that the value is zero.
  const nativeBalance = balances.find((balance) => isNativeBalance(balance));
  if (
    nativeBalance &&
    getTotalInWholeUnits(nativeBalance).gt(0) &&
    !tokenPrices[NATIVE_PRICE_ID]?.currentPrice
  ) {
    return null;
  }
  // Rule 5: funded when the USD value is above zero.
  const { totalUsd } = getTotalUsd(tokenPrices, balances);
  return new BigNumber(totalUsd).gt(0);
};

const syncFundedAccountCount = (allAccounts: Account[]) => {
  // Without an account list, the wallet traits would be wrong. The next
  // result or app data load syncs them.
  if (!allAccounts.length) {
    return;
  }
  syncIdentifyTraits(allAccounts);
};

/**
 * Processes a result of the active-account fetch. Updates the funding record
 * of the account, and emits `account.funded` when the account goes from
 * unfunded to funded. Ignores data for an account or network that is not
 * active, and data off mainnet.
 */
export const onAccountValue = (params: {
  publicKey: string;
  networkDetails: NetworkDetails;
  input: AccountValueInput;
}): void => {
  try {
    processAccountValue(params);
  } catch (e) {
    // Analytics must never break the Account view.
    captureException(`Error processing account.funded detection - ${e}`);
  }
};

const processAccountValue = ({
  publicKey,
  networkDetails,
  input,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
  input: AccountValueInput;
}): void => {
  if (!isMainnet(networkDetails)) {
    return;
  }
  const state = store.getState();
  const activeNetworkDetails = settingsNetworkDetailsSelector(state);
  if (
    publicKeySelector(state) !== publicKey ||
    !isMainnet(activeNetworkDetails)
  ) {
    return;
  }

  const funded = toFunded(input);
  if (funded === null) {
    return;
  }

  const record = { ...getFundingRecord(FUNDING_NETWORK, publicKey) };
  record.funded = funded;
  if (record.status === undefined) {
    // The first result sets the state and never emits.
    record.status = funded ? "funded" : "unfunded";
  } else if (!funded) {
    record.status = "unfunded";
  } else if (record.status !== "funded") {
    const isSent = emitMetric(METRIC_NAMES.accountFunded);
    record.status = isSent ? "funded" : "pending";
  }
  saveFundingRecord(FUNDING_NETWORK, publicKey, record);
  syncFundedAccountCount(allAccountsSelector(state) ?? []);
};

/**
 * Processes a result of the all-accounts fetch for one own account. Updates
 * only `funded`. It never changes `status`, so it never emits an event.
 */
export const onListAccountValue = (params: {
  publicKey: string;
  networkDetails: NetworkDetails;
  allAccounts: Account[];
  input: AccountValueInput;
}): void => {
  try {
    processListAccountValue(params);
  } catch (e) {
    // Analytics must never break the account list.
    captureException(`Error processing funded_account_count update - ${e}`);
  }
};

const processListAccountValue = ({
  publicKey,
  networkDetails,
  allAccounts,
  input,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
  allAccounts: Account[];
  input: AccountValueInput;
}): void => {
  if (!isMainnet(networkDetails)) {
    return;
  }
  if (!allAccounts.some((account) => account.publicKey === publicKey)) {
    return;
  }

  const funded = toFunded(input);
  if (funded === null) {
    return;
  }

  const record = { ...getFundingRecord(FUNDING_NETWORK, publicKey) };
  record.funded = funded;
  saveFundingRecord(FUNDING_NETWORK, publicKey, record);
  syncFundedAccountCount(allAccounts);
};
