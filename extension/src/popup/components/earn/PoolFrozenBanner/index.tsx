import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { InfoBottomSheet } from "popup/components/InfoBottomSheet";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";

import "./styles.scss";

interface PoolFrozenBannerProps {
  /** Opens the "Why can't I deposit?" sheet, which the host renders. */
  onOpen: () => void;
}

/**
 * Says a pool is frozen, so it takes no deposits, on the screens that would
 * otherwise offer one: the token picker and a supplied token's position
 * screen. Its link opens {@link PoolFrozenSheet}, rendered by the host next to
 * its other sheets so it spans the popup rather than the host's padded
 * content.
 *
 * Modelled on the "Withdrawals temporarily unavailable" card (Figma Varial
 * 4878:106535) and its "Why can't I withdraw?" sheet (4878:106729). "Frozen"
 * is Blend's own word for every status that stops deposits.
 */
export const PoolFrozenBanner = ({ onOpen }: PoolFrozenBannerProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="PoolFrozenBanner"
      onClick={onOpen}
      data-testid="earn-pool-frozen-banner"
    >
      <span className="PoolFrozenBanner__title">
        <Icon.InfoCircle />
        {t("Deposits temporarily unavailable")}
      </span>
      <span className="PoolFrozenBanner__body">
        {t(
          "This pool is frozen, so it isn’t accepting new deposits right now.",
        )}
      </span>
      <span className="PoolFrozenBanner__link">
        {t("Why can’t I deposit?")}
      </span>
    </button>
  );
};

interface PoolFrozenSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The pool's backend name; formatPoolName falls back when it has none. */
  poolName: string | null;
}

/** What a frozen pool means, and what still works. */
export const PoolFrozenSheet = ({
  isOpen,
  onClose,
  poolName,
}: PoolFrozenSheetProps) => {
  const { t } = useTranslation();

  return (
    <InfoBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={t("Why can’t I deposit?")}
      actionLabel={t("Got it")}
      data-testid="earn-pool-frozen-sheet"
      closeTestId="earn-pool-frozen-sheet-close"
      actionTestId="earn-pool-frozen-sheet-action"
    >
      <div className="PoolFrozenSheet">
        <div>
          {t(
            "This pool is frozen, which means it isn’t accepting new deposits. Blend pools are frozen to protect the funds already in them.",
          )}
        </div>
        <div className="PoolFrozenSheet__summary">
          <div className="PoolFrozenSheet__row">
            <span>{t("Pool")}</span>
            <span className="PoolFrozenSheet__value">
              {formatPoolName(poolName, t)}
            </span>
          </div>
          <div className="PoolFrozenSheet__row">
            <span>{t("Status")}</span>
            <span
              className="PoolFrozenSheet__value"
              data-testid="earn-pool-frozen-sheet-status"
            >
              {t("Frozen")}
            </span>
          </div>
        </div>
        <div>
          {t(
            "Tokens you’ve already deposited stay in the pool and can still be withdrawn. You’ll be able to deposit again once the pool is unfrozen.",
          )}
        </div>
      </div>
    </InfoBottomSheet>
  );
};
