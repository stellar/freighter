import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import BlendLogo from "popup/assets/blend-logo.svg";
import { EarnGlow } from "popup/components/earn/EarnGlow";

import "./styles.scss";

// A four-point star, coloured by its host through `currentColor`.
const Sparkle = ({ className }: { className: string }) => (
  <svg
    className={className}
    viewBox="0 0 9.70129 9.70129"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M4.45906 0.228646C4.57153 -0.0762157 5.12976 -0.0762154 5.24223 0.228647C6.00229 2.28886 7.41242 3.699 9.47264 4.45906C9.7775 4.57153 9.7775 5.12976 9.47264 5.24223C7.41242 6.00229 6.00229 7.41242 5.24223 9.47264C5.12976 9.7775 4.57153 9.7775 4.45906 9.47264C3.699 7.41242 2.28886 6.00229 0.228646 5.24223C-0.0762157 5.12976 -0.0762154 4.57153 0.228647 4.45906C2.28886 3.699 3.699 2.28886 4.45906 0.228646Z"
      fill="currentColor"
    />
  </svg>
);

interface EarnIntroProps {
  onStart: () => void;
  onClose: () => void;
}

/**
 * One-time interstitial shown the first time a user enters the Earn flow.
 *
 * A full view rather than a modal: it fills the popup, top to bottom, with the
 * close affordance in the header and the primary action pinned to the footer.
 *
 * Figma: Varial 4464:110421 ("Blend intro (first time user only)"), drawn at
 * the popup's own 360x600.
 */
export const EarnIntro = ({ onStart, onClose }: EarnIntroProps) => {
  const { t } = useTranslation();

  const features = [
    {
      key: "yield",
      title: t("Earn variable yield"),
      body: t("Supply supported tokens and earn based on current APY."),
    },
    {
      key: "control",
      title: t("Stay in control"),
      body: t("Manage and withdraw your supplied tokens from your wallet."),
    },
  ];

  return (
    <div className="EarnIntro" data-testid="earn-intro">
      {/* Sits outside __content, which scrolls and would clip it. */}
      <EarnGlow className="EarnIntro__glow" />

      <div className="EarnIntro__header">
        <button
          type="button"
          className="EarnIntro__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-intro-close"
        >
          <Icon.X />
        </button>
      </div>

      <div className="EarnIntro__content">
        <div className="EarnIntro__intro">
          <div className="EarnIntro__mark">
            <img className="EarnIntro__logo" src={BlendLogo} alt="" />
            {/* Decorative sparkles around the mark, placed as in the design. */}
            <Sparkle className="EarnIntro__sparkle EarnIntro__sparkle--top" />
            <Sparkle className="EarnIntro__sparkle EarnIntro__sparkle--right" />
            <Sparkle className="EarnIntro__sparkle EarnIntro__sparkle--left" />
          </div>

          <div className="EarnIntro__copy">
            <h1 className="EarnIntro__title">{t("Put your tokens to work")}</h1>
            <div className="EarnIntro__subtitle">
              <Text as="p" size="sm" weight="regular">
                {t("Supply tokens to Blend and earn variable yield.")}
              </Text>
            </div>
          </div>
        </div>

        <ul className="EarnIntro__features">
          {features.map(({ key, title, body }) => (
            <li className="EarnIntro__feature" key={key}>
              <div className="EarnIntro__feature__icon" aria-hidden="true">
                <Icon.Asterisk01 />
              </div>
              <div className="EarnIntro__feature__copy">
                <div className="EarnIntro__feature__title">{title}</div>
                <div className="EarnIntro__feature__body">{body}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="EarnIntro__footer">
        <Button
          size="lg"
          variant="secondary"
          isFullWidth
          isRounded
          onClick={onStart}
          data-testid="earn-intro-start"
        >
          {t("Continue")}
        </Button>
      </div>
    </div>
  );
};
