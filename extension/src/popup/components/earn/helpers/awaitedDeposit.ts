import BigNumber from "bignumber.js";

import { AccountPositions } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { AwaitedDeposit } from "popup/ducks/earn";

import { getSupplyRowDecimals } from "./positionRows";

/** How long Home waits for a deposit to show in Positions before giving up. */
export const AWAITED_DEPOSIT_MS = 30_000;

/** How often Home re-reads Positions while it waits. */
export const AWAITED_DEPOSIT_POLL_MS = 3_000;

/**
 * Whether these positions already include the awaited deposit: the deposited
 * reserve holds at least the amount the deposit should have brought it to.
 * A token whose scale is unknown can't be measured, so the wait carries on
 * until it times out; every read along the way still updates Positions.
 */
export const hasDepositLanded = (
  positions: AccountPositions,
  awaited: AwaitedDeposit,
  networkDetails: NetworkDetails,
): boolean => {
  const row = positions.positions
    .find((position) => position.id === awaited.poolId)
    ?.blend?.supply.find((supply) => supply.assetId === awaited.assetId);
  if (!row) {
    return false;
  }

  const decimals = getSupplyRowDecimals(row, networkDetails);
  if (decimals === null) {
    return false;
  }
  const tokens = new BigNumber(row.totalTokens).shiftedBy(-decimals);
  return tokens.gte(awaited.minTokens);
};
