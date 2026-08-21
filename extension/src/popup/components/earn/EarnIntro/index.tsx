import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import "./styles.scss";

interface EarnIntroProps {
  onStart: () => void;
  onClose: () => void;
}

/**
 * One-time interstitial shown the first time a user enters the Earn flow.
 *
 * A full step rather than a modal: it fills the popup and the artwork needs the
 * whole viewport, which a self-measuring SlideupModal cannot give it.
 *
 * The artwork slot is a placeholder pending the final asset from design.
 */
export const EarnIntro = ({ onStart, onClose }: EarnIntroProps) => {
  const { t } = useTranslation();

  return (
    <div className="EarnIntro" data-testid="earn-intro">
      <div className="EarnIntro__art">
        <button
          type="button"
          className="EarnIntro__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-intro-close"
        >
          <Icon.XClose />
        </button>
      </div>

      <div className="EarnIntro__content">
        <div className="EarnIntro__title">
          <Text as="h1" size="lg" weight="semi-bold">
            {t("Make your tokens earn for you")}
          </Text>
        </div>

        <div className="EarnIntro__body">
          <Text as="p" size="sm" weight="regular">
            {t(
              "Deposit supported tokens into DeFi pools and start earning rewards.",
            )}
          </Text>
        </div>

        <Button
          size="md"
          variant="secondary"
          isFullWidth
          isRounded
          onClick={onStart}
          data-testid="earn-intro-start"
        >
          {t("Start earning")}
        </Button>
      </div>
    </div>
  );
};
