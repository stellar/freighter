import React from "react";
import { Button } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { isEarnSupportedNetwork } from "@shared/constants/blend";
import { ROUTES } from "popup/constants/routes";
import { EARN_SOURCE, EARN_SOURCE_KEY } from "popup/constants/earn";
import { earnDepositSelector } from "popup/ducks/remoteConfig";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { navigateTo } from "popup/helpers/navigate";
import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
import { formatAmount } from "popup/helpers/formatters";

interface EmptyStateProps {
  /** Annual projection in USD, or null when there is nothing to total. */
  projectedUsd: string | null;
  /** Best rate on offer — the fallback figure, and null when even that is unknown. */
  bestApy: number | null;
  /** Fired when the CTA is pressed, before it navigates to Earn. */
  onStartEarning: () => void;
}

/**
 * Shown once the positions request lands with nothing.
 *
 * The card promises a dollar figure when the account actually holds something
 * depositable, and the ceiling rate when it does not — a new account has no
 * balance to project from, so "$0.00/year" would read as a rejection rather
 * than an invitation. With neither figure known, the card is omitted entirely
 * rather than rendering blank.
 *
 * The CTA's navigation lives here, in one place, rather than behind a prop —
 * which is why Task 12 only had to touch this one call site to add the
 * `source` query param the deposit funnel attributes back to this CTA.
 */
export const EmptyState = ({
  projectedUsd,
  bestApy,
  onStartEarning,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isEarnDepositEnabled = useSelector(earnDepositSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const canDeposit =
    isEarnDepositEnabled && isEarnSupportedNetwork(networkDetails);
  const hasProjection = projectedUsd !== null || bestApy !== null;

  return (
    <div
      className="AccountPositions__empty"
      data-testid="account-positions-empty"
    >
      <div className="AccountPositions__empty__title">
        {t("No positions yet")}
      </div>
      <div className="AccountPositions__empty__subtitle">
        {t(
          "Put your crypto to work and earn rewards while keeping track of your positions.",
        )}
      </div>

      {hasProjection && (
        <div
          className="AccountPositions__empty__projection"
          data-testid="account-positions-projection"
        >
          <div className="AccountPositions__empty__projection__label">
            {t("You could earn up to")}
          </div>
          <div className="AccountPositions__empty__projection__value">
            <span className="AccountPositions__empty__projection__figure">
              {projectedUsd !== null
                ? `$${formatAmount(projectedUsd)}`
                : formatRate(bestApy)}
            </span>
            {t("/year on your tokens")}
          </div>
        </div>
      )}

      {canDeposit && (
        <div className="AccountPositions__empty__cta">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            isRounded
            onClick={() => {
              onStartEarning();
              navigateTo(
                ROUTES.earn,
                navigate,
                `?${EARN_SOURCE_KEY}=${EARN_SOURCE.POSITIONS_EMPTY}`,
              );
            }}
            data-testid="account-positions-start-earning"
          >
            {t("Start Earning")}
          </Button>
        </div>
      )}
    </div>
  );
};
