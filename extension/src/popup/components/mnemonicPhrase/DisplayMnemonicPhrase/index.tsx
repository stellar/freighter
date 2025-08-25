import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Text } from "@stellar/design-system";

import { OnboardingModal } from "popup/components/Onboarding";

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
    <OnboardingModal
      data-testid="display-mnemonic-phrase"
      headerText="Your Recovery Phrase"
      bodyText={
        <>
          <Text as="p" size="md">
            {t(
              "Never disclose your recovery phrase! If you do, someone will be able to access your wallet.",
            )}
          </Text>
        </>
      }
    >
      <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} />
      <Button
        size="md"
        data-testid="display-mnemonic-phrase-next-btn"
        isFullWidth
        isRounded
        variant="secondary"
        onClick={() => {
          setIsConfirmed(true);
        }}
      >
        {t("I’ve saved my phrase somewhere safe")}
      </Button>
    </OnboardingModal>
  );
};
