import React, { useState } from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { InfoBottomSheet } from "popup/components/InfoBottomSheet";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";

import "./styles.scss";

interface PoolPausedBannerProps {
  /** The pool's backend name; formatPoolName falls back when it has none. */
  poolName: string | null;
}

/**
 * Says a pool isn't taking deposits (Blend status frozen or setup), and why,
 * on the screens that would otherwise offer one: the token picker and a
 * supplied token's position screen.
 *
 * Modelled on the "Withdrawals temporarily unavailable" card (Figma Varial
 * 4878:106535) and its "Why can't I withdraw?" sheet (4878:106729): an amber
 * card whose link opens an info sheet. Blend's own app treats every one of
 * these statuses as one "frozen" state, so this does too.
 */
export const PoolPausedBanner = ({ poolName }: PoolPausedBannerProps) => {
  const { t } = useTranslation();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="PoolPausedBanner"
        onClick={() => setIsSheetOpen(true)}
        data-testid="earn-pool-paused-banner"
      >
        <span className="PoolPausedBanner__title">
          <Icon.InfoCircle />
          {t("Deposits temporarily unavailable")}
        </span>
        <span className="PoolPausedBanner__body">
          {t("This pool isn’t accepting new deposits right now.")}
        </span>
        <span className="PoolPausedBanner__link">
          {t("Why can’t I deposit?")}
        </span>
      </button>

      <InfoBottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={t("Why can’t I deposit?")}
        actionLabel={t("Got it")}
        data-testid="earn-pool-paused-sheet"
        closeTestId="earn-pool-paused-sheet-close"
        actionTestId="earn-pool-paused-sheet-action"
      >
        <div className="PoolPausedSheet">
          <p>
            {t(
              "Blend has paused new deposits into this pool. This happens while a pool is still being set up, or to protect the funds already in it.",
            )}
          </p>
          <div className="PoolPausedSheet__summary">
            <div className="PoolPausedSheet__row">
              <span>{t("Pool")}</span>
              <span className="PoolPausedSheet__value">
                {formatPoolName(poolName, t)}
              </span>
            </div>
            <div className="PoolPausedSheet__row">
              <span>{t("New deposits")}</span>
              <span
                className="PoolPausedSheet__value"
                data-testid="earn-pool-paused-sheet-status"
              >
                {t("Paused")}
              </span>
            </div>
          </div>
          <p>
            {t(
              "Tokens you’ve already deposited stay in the pool and can still be withdrawn. You’ll be able to deposit again once Blend reopens it.",
            )}
          </p>
        </div>
      </InfoBottomSheet>
    </>
  );
};
