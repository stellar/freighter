import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { InfoBottomSheet } from "popup/components/InfoBottomSheet";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";

import "./styles.scss";

interface PoolPausedBannerProps {
  /** Opens the "Why can't I deposit?" sheet, which the host renders. */
  onOpen: () => void;
}

/**
 * Says a pool isn't taking deposits (Blend status frozen or setup) on the
 * screens that would otherwise offer one: the token picker and a supplied
 * token's position screen. Its link opens {@link PoolPausedSheet}, rendered
 * by the host next to its other sheets so it spans the popup rather than the
 * host's padded content.
 *
 * Modelled on the "Withdrawals temporarily unavailable" card (Figma Varial
 * 4878:106535) and its "Why can't I withdraw?" sheet (4878:106729). Blend's
 * own app treats every one of these statuses as one "frozen" state, so this
 * does too.
 */
export const PoolPausedBanner = ({ onOpen }: PoolPausedBannerProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="PoolPausedBanner"
      onClick={onOpen}
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
  );
};

interface PoolPausedSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The pool's backend name; formatPoolName falls back when it has none. */
  poolName: string | null;
}

/** Why the pool takes no deposits, and what still works. */
export const PoolPausedSheet = ({
  isOpen,
  onClose,
  poolName,
}: PoolPausedSheetProps) => {
  const { t } = useTranslation();

  return (
    <InfoBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("Why can’t I deposit?")}
      actionLabel={t("Got it")}
      data-testid="earn-pool-paused-sheet"
      closeTestId="earn-pool-paused-sheet-close"
      actionTestId="earn-pool-paused-sheet-action"
    >
      <div className="PoolPausedSheet">
        <div>
          {t(
            "Blend has paused new deposits into this pool. This happens while a pool is still being set up, or to protect the funds already in it.",
          )}
        </div>
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
        <div>
          {t(
            "Tokens you’ve already deposited stay in the pool and can still be withdrawn. You’ll be able to deposit again once Blend reopens it.",
          )}
        </div>
      </div>
    </InfoBottomSheet>
  );
};
