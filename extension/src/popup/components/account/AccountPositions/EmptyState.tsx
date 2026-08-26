import React from "react";
import { Button } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { formatRate } from "popup/components/earn/helpers/formatPoolStats";
import { formatAmount } from "popup/helpers/formatters";

interface EmptyStateProps {
  /** Annual projection in USD, or null when there is nothing to total. */
  projectedUsd: string | null;
  /** Best rate on offer — the fallback figure, and null when even that is unknown. */
  bestApy: number | null;
  /** Fired when the CTA is pressed, before it navigates to Earn (Task 12 wires this up). */
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
 * Task 12 only has to touch this one call site to add its analytics `source`
 * query param.
 */
export const EmptyState = ({
  projectedUsd,
  bestApy,
  onStartEarning,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

      <div className="AccountPositions__empty__cta">
        <Button
          type="button"
          variant="secondary"
          size="lg"
          isRounded
          onClick={() => {
            onStartEarning();
            navigateTo(ROUTES.earn, navigate);
          }}
          data-testid="account-positions-start-earning"
        >
          {t("Start Earning")}
        </Button>
      </div>
    </div>
  );
};
