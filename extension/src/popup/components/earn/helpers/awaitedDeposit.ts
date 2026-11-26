import BigNumber from "bignumber.js";

import { AccountPositions } from "@shared/api/types/blend";
import { AwaitedDeposit } from "popup/ducks/earn";

/** How long Home waits for a deposit to show in Positions before giving up. */
export const AWAITED_DEPOSIT_MS = 30_000;

/** How often Home re-reads Positions while it waits. */
export const AWAITED_DEPOSIT_POLL_MS = 3_000;

/**
 * Whether these positions already include the awaited deposit: the deposited
 * reserve holds at least the amount the deposit should have brought it to.
 */
export const hasDepositLanded = (
  positions: AccountPositions,
  awaited: AwaitedDeposit,
): boolean => {
  const row = positions.positions
    .find((position) => position.id === awaited.poolId)
    ?.blend?.supply.find((supply) => supply.assetId === awaited.assetId);
  if (!row) {
    return false;
  }

  // Blend reserves are SAC tokens, which are always 7-decimal; the row's own
  // scale wins whenever the backend knows it.
  const tokens = new BigNumber(row.totalTokens).shiftedBy(-(row.decimals ?? 7));
  return tokens.gte(awaited.minTokens);
};
