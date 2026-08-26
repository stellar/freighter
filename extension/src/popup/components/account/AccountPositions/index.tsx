import React from "react";
import { Loader, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AccountPositions as AccountPositionsData } from "@shared/api/types/blend";
import { AssetIcons } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

import {
  PositionTokenRow,
  toPositionTokenRows,
} from "popup/components/earn/helpers/positionRows";
import { PositionRow } from "./PositionRow";

import "./styles.scss";

interface AccountPositionsProps {
  positions: AccountPositionsData | null;
  /**
   * The request has not settled. Distinct from having none: `positions` is
   * empty in both cases, and showing the empty state here would tell the
   * account it holds nothing while the answer is still in flight.
   */
  isLoading: boolean;
  /** The request rejected. Renders instead of the empty state, never beside it. */
  hasError: boolean;
  assetIcons: AssetIcons;
  networkDetails: NetworkDetails;
  /** A row was clicked; opens that position's pool-details sheet (Task 10). */
  onSelectRow: (row: PositionTokenRow) => void;
}

/**
 * The Home screen's Positions tab.
 *
 * Structured like AccountCollectibles, with one addition: a real error state.
 * Collectibles swallow their failures because an unreachable collectible is
 * indistinguishable from an unowned one; a position is money, so "we could not
 * load this" must never render as "you have none".
 *
 * The error renders inside the pane rather than through the view's
 * `AccountView__fetch-fail` notification, which sits above the slider and would
 * push a banner across the Tokens and Collectibles tabs too.
 */
export const AccountPositions = ({
  positions,
  isLoading,
  hasError,
  assetIcons,
  networkDetails,
  onSelectRow,
}: AccountPositionsProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="AccountPositions" data-testid="account-positions">
        <div
          className="AccountPositions__loader"
          data-testid="account-positions-loader"
        >
          <Loader size="2rem" />
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="AccountPositions" data-testid="account-positions">
        <div
          className="AccountPositions__error"
          data-testid="account-positions-error"
        >
          <Notification
            variant="error"
            title={t("Failed to fetch your positions.")}
          >
            {t("Your positions could not be fetched at this time.")}
          </Notification>
        </div>
      </div>
    );
  }

  const rows = toPositionTokenRows({ positions, networkDetails });

  if (!rows.length) {
    return (
      <div className="AccountPositions" data-testid="account-positions">
        {/* The empty state's projection card arrives in Task 7. */}
        <div className="AccountPositions__empty">
          <div className="AccountPositions__empty__title">
            {t("No positions yet")}
          </div>
          <div className="AccountPositions__empty__subtitle">
            {t(
              "Put your crypto to work and earn rewards while keeping track of your positions.",
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="AccountPositions" data-testid="account-positions">
      <div className="AccountPositions__list">
        {rows.map((row) => (
          <PositionRow
            key={`${row.poolId}-${row.assetId}`}
            row={row}
            assetIcons={assetIcons}
            onClick={() => onSelectRow(row)}
          />
        ))}
      </div>
    </div>
  );
};
