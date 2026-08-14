/**
 * One page of v2 account-history transactions → normalized HistoryEntry[].
 *
 * The single mapping pipeline shared by every v2 history surface — the
 * History view's hook (useGetHistoryDataV2) and the home screen's per-asset
 * history (useGetAccountHistoryData) — so token resolution and mapping cannot
 * drift between them. Callers apply their own filtering (dust, per-token) on
 * the result.
 */

import { V2AccountTransaction } from "@shared/api/types/backend-api";
import { NetworkDetails } from "@shared/constants/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { buildTokenContext } from "popup/helpers/history/tokenResolver";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { HistoryEntry } from "popup/views/AccountHistory/model";
import {
  collectTokenIds,
  mapV2Transaction,
} from "popup/views/AccountHistory/mappers/v2";

export const mapV2Page = async ({
  transactions,
  publicKey,
  networkDetails,
  balances,
  assetsListsData,
}: {
  transactions: V2AccountTransaction[];
  publicKey: string;
  networkDetails: NetworkDetails;
  balances: AccountBalances;
  assetsListsData: Parameters<typeof buildTokenContext>[0]["assetsListsData"];
}): Promise<HistoryEntry[]> => {
  const nativeTokenId = getNativeContractDetails(networkDetails).contract;
  const tokens = await buildTokenContext({
    tokenIds: collectTokenIds(transactions),
    networkDetails,
    publicKey,
    balances,
    assetsListsData,
  });
  return transactions.map((tx) =>
    mapV2Transaction(tx, { tokens, publicKey, nativeTokenId }),
  );
};
