import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Notification } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import {
  OnboardingScreen,
  OnboardingHalfScreen,
  OnboardingHeader,
} from "popup/components/Onboarding";

import { MnemonicDisplay } from "../MnemonicDisplay";

import "./styles.scss";

export const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
}: {
  mnemonicPhrase: string;
}) => {
  const { t } = useTranslation();

  return (
    <div
      className="DisplayMnemonicPhrase"
      data-testid="display-mnemonic-phrase"
    >
      <OnboardingScreen className="DisplayMnemonicPhrase__screen">
        <OnboardingHalfScreen className="DisplayMnemonicPhrase__half-screen">
          <OnboardingHeader className="DisplayMnemonicPhrase__header">
            {t("Secret Recovery phrase")}
          </OnboardingHeader>
          <div className="DisplayMnemonicPhrase__content">
            <p>
              {t(
                "Your recovery phrase gives you access to your account and is the",
              )}{" "}
              <strong>{t("only way to access it in a new browser")}</strong>.{" "}
              {t("Keep it in a safe place.")}
            </p>
            <p>
              {t(
                "For your security, we'll check if you got it right in the next step.",
              )}
            </p>
          </div>
        </OnboardingHalfScreen>
        <OnboardingHalfScreen className="DisplayMnemonicPhrase__half-screen">
          <Notification
            variant="warning"
            title={t("IMPORTANT WARNING")}
            icon={<Icon.Warning />}
          >
            {t("Never disclose your recovery phrase")}!
          </Notification>
          <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} />
          <Button
            size="md"
            data-testid="display-mnemonic-phrase-next-btn"
            isFullWidth
            variant="primary"
            onClick={() => {
              navigateTo(ROUTES.mnemonicPhraseConfirm);
            }}
          >
            {t("Next")}
          </Button>
        </OnboardingHalfScreen>
      </OnboardingScreen>
    </div>
  );
};
