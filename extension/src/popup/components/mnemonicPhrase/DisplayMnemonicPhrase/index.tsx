import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Notification } from "@stellar/design-system";

import {
  OnboardingHeader,
  OnboardingTwoCol,
  OnboardingOneCol,
} from "popup/components/Onboarding";

import { MnemonicDisplay } from "../MnemonicDisplay";

import "./styles.scss";

export const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
  setIsConfirmed,
  isMigration,
}: {
  mnemonicPhrase: string;
  setIsConfirmed: (confirmed: boolean) => void;
  isMigration?: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <OnboardingTwoCol data-testid="display-mnemonic-phrase">
      <OnboardingOneCol>
        <OnboardingHeader>
          {isMigration
            ? t("Now, let’s create a new mnemonic phrase")
            : t("Secret Recovery phrase")}
        </OnboardingHeader>
        <div className="DisplayMnemonicPhrase__content">
          {isMigration ? (
            <p>
              {t("This new backup phrase will be used for your new accounts.")}
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </OnboardingOneCol>

      <OnboardingOneCol>
        <Notification
          variant="warning"
          title={t("Important Warning")}
          icon={<Icon.InfoOctagon />}
        >
          {t("Never disclose your recovery phrase")}!
        </Notification>
        <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} />
        <Button
          size="md"
          data-testid="display-mnemonic-phrase-next-btn"
          isFullWidth
          variant="secondary"
          onClick={() => {
            setIsConfirmed(true);
          }}
        >
          {t("Next")}
        </Button>
      </OnboardingOneCol>
    </OnboardingTwoCol>
  );
};
