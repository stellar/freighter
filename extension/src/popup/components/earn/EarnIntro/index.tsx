import React from "react";
import { Button, Heading, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import BlendLogo from "popup/assets/blend-logo.svg";
import EarnGlow from "popup/assets/earn-glow.svg";

import "./styles.scss";

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
 * Ported from Figma `Freighter-Mobile` node 13701:332277 ("Blend intro (first
 * time user)"). The mock is a 402x874 phone frame; the popup is 360x600, so
 * every horizontal measure carries over unchanged (both use 24px gutters) while
 * the header-to-content gap is the one measure tightened to fit the shorter
 * viewport.
 */
export const EarnIntro = ({ onStart, onClose }: EarnIntroProps) => {
  const { t } = useTranslation();

  const features = [
    {
      key: "yield",
      title: t("Earn variable yield"),
      body: t("Supply supported assets and earn based on current APY."),
    },
    {
      key: "control",
      title: t("Stay in control"),
      body: t("Manage and withdraw your supplied assets from your wallet."),
    },
  ];

  return (
    <div className="EarnIntro" data-testid="earn-intro">
      {/* Sits outside __content, which scrolls and would clip it. */}
      <img className="EarnIntro__glow" src={EarnGlow} alt="" />

      <div className="EarnIntro__header">
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
        <div className="EarnIntro__intro">
          <img className="EarnIntro__logo" src={BlendLogo} alt="" />

          <div className="EarnIntro__copy">
            <Heading as="h1" size="sm" weight="medium">
              {t("Earn with Blend")}
            </Heading>
            <div className="EarnIntro__subtitle">
              <Text as="p" size="sm" weight="regular">
                {t("Supply assets to Blend and earn variable yield.")}
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
                <Text as="div" size="md" weight="medium">
                  {title}
                </Text>
                <div className="EarnIntro__feature__body">
                  <Text as="p" size="sm" weight="regular">
                    {body}
                  </Text>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="EarnIntro__footer">
        <Button
          size="xl"
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
