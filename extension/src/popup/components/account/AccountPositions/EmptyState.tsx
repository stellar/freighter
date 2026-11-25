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

import { SparkleIcon } from "./PositionIcons";

interface EmptyStateProps {
  /** Annual projection in USD, or null when there is nothing to total. */
  projectedUsd: string | null;
  /** Best rate on offer — the fallback figure, and null when even that is unknown. */
  bestApy: number | null;
  /** Fired when the CTA is pressed, before it navigates to Earn. */
  onStartEarning: () => void;
}

/**
 * The Positions tab with nothing supplied (Figma Varial 4464:110306).
 *
 * "Earn up to" is what the account's own depositable tokens would earn in a
 * year at each token's best rate (`projectAnnualEarnings`). With nothing
 * depositable held it falls back to the best rate on offer, and with neither
 * figure known the row is left out.
 *
 * The CTA follows the same flag and network gate as every entry into Earn.
 * With it off the card stays: it is informational, not an offer (R11).
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
    <div className="PositionsEmpty" data-testid="account-positions-empty">
      <div className="PositionsEmpty__card">
        <div className="PositionsEmpty__icon">
          <SparkleIcon />
        </div>
        <div className="PositionsEmpty__copy">
          <div className="PositionsEmpty__title">{t("Start earning")}</div>
          <div className="PositionsEmpty__subtitle">
            {t(
              "Put your tokens to work and earn rewards while keeping track of your positions.",
            )}
          </div>
        </div>

        {hasProjection && (
          <div
            className="PositionsEmpty__projection"
            data-testid="account-positions-projection"
          >
            <div className="PositionsEmpty__projection__label">
              {t("Earn up to")}
            </div>
            <div className="PositionsEmpty__projection__value">
              <span className="PositionsEmpty__projection__figure">
                {`${
                  projectedUsd !== null
                    ? `$${formatAmount(projectedUsd)}`
                    : formatRate(bestApy)
                } /`}
              </span>
              <span className="PositionsEmpty__projection__unit">
                {t("year on your tokens")}
              </span>
            </div>
          </div>
        )}

        {canDeposit && (
          <Button
            type="button"
            variant="secondary"
            size="md"
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
        )}
      </div>
    </div>
  );
};
