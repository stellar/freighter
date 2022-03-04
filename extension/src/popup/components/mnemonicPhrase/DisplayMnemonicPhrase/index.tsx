import React from "react";
import {
  Icon,
  InfoBlock,
  CopyText,
  TextLink,
  Button,
} from "@stellar/design-system";

import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { download } from "popup/helpers/download";

import {
  OnboardingScreen,
  OnboardingHalfScreen,
  OnboardingHeader,
} from "popup/components/Onboarding";

import { MnemonicDisplay } from "../MnemonicDisplay";

import "./styles.scss";

export const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
  setReadyToConfirm,
}: {
  mnemonicPhrase: string;
  setReadyToConfirm: (readyState: boolean) => void;
}) => (
  <>
    <OnboardingScreen className="DisplayMnemonicPhrase__screen">
      <OnboardingHalfScreen className="DisplayMnemonicPhrase__half-screen">
        <OnboardingHeader className="DisplayMnemonicPhrase__header">
          Secret Recovery phrase
        </OnboardingHeader>
        <div className="DisplayMnemonicPhrase__content">
          <p>
            Your recovery phrase gives you access to your account and is the{" "}
            <strong>only way to access it in a new browser</strong>. Keep it in
            a safe place.
          </p>
          <p>
            For your security, we'll check if you got it right in the next step.
          </p>
        </div>
      </OnboardingHalfScreen>
      <OnboardingHalfScreen className="DisplayMnemonicPhrase__half-screen">
        <InfoBlock variant={InfoBlock.variant.warning}>
          <strong>IMPORTANT WARNING</strong>
          <p>Never disclose your recovery phrase!</p>
        </InfoBlock>
        <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} />

        {/* TODO - use Custom Button from SDS when added */}
        <div className="DisplayMnemonicPhrase__display-buttons">
          <button
            className="DisplayMnemonicPhrase__download-button"
            data-testid="download"
            onClick={() => {
              download({
                filename: "freighterMnemonicPhrase.txt",
                content: mnemonicPhrase,
              });
              emitMetric(METRIC_NAMES.accountCreatorMnemonicDownloadPhrase);
            }}
          >
            <TextLink iconRight={<Icon.Download />}>DOWNLOAD</TextLink>
          </button>
          <CopyText textToCopy={mnemonicPhrase} showCopyIcon showTooltip>
            <TextLink>COPY</TextLink>
          </CopyText>
        </div>
        <Button
          fullWidth
          onClick={() => {
            setReadyToConfirm(true);
          }}
        >
          Next
        </Button>
      </OnboardingHalfScreen>
    </OnboardingScreen>
  </>
);
