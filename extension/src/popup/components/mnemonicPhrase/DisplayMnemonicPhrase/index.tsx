import React from "react";
import { useTranslation } from "react-i18next";

import { InfoBlock } from "popup/basics/InfoBlock";
import { Button } from "popup/basics/buttons/Button";

import {
  OnboardingScreen,
  OnboardingHalfScreen,
  OnboardingHeader,
} from "popup/components/Onboarding";

import { MnemonicDisplay } from "../MnemonicDisplay";

import "./styles.scss";

export const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
  setIsConfirmed,
}: {
  mnemonicPhrase: string;
  setIsConfirmed: (confirmed: boolean) => void;
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
          <InfoBlock variant={InfoBlock.variant.warning}>
            <div>
              <strong>{t("IMPORTANT WARNING")}</strong>
              <p>{t("Never disclose your recovery phrase")}!</p>
            </div>
          </InfoBlock>
          <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} />
          <Button
            data-testid="display-mnemonic-phrase-next-btn"
            fullWidth
            onClick={() => {
              setIsConfirmed(true);
            }}
          >
            {t("Next")}
          </Button>
        </OnboardingHalfScreen>
      </OnboardingScreen>
    </div>
  );
};
