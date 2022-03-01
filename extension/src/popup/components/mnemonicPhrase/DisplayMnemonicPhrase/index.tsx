import React from "react";
import { InfoBlock, CopyText, TextLink, Button } from "@stellar/design-system";

import { emitMetric } from "helpers/metrics";

import DownloadIcon from "popup/assets/download.svg";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { download } from "popup/helpers/download";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import { ActionButton } from "../ActionButton";
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
    <FullscreenStyle />
    <div className="DisplayMnemonicPhrase--screen">
      <div className="DisplayMnemonicPhrase--half-screen">
        <div className="DisplayMnemonicPhrase--header">
          Secret Recovery phrase
        </div>
        <div className="DisplayMnemonicPhrase--content">
          <p>
            Your recovery phrase gives you access to your account and is the{" "}
            <strong>only way to access it in a new browser</strong>. Keep it in
            a safe place.
          </p>
          <p>
            For your security, we'll check if you got it right in the next step.
          </p>
        </div>
      </div>
      <div className="DisplayMnemonicPhrase--half-screen">
        <InfoBlock variant={InfoBlock.variant.warning}>
          <strong>IMPORTANT WARNING</strong>
          <p>Never disclose your recovery phrase!</p>
        </InfoBlock>
        <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} />

        {/* TODO - use Custom Button from SDS when added */}
        <div className="DisplayMnemonicPhrase--display-buttons">
          <ActionButton
            data-testid="download"
            onClick={() => {
              download({
                filename: "freighterMnemonicPhrase.txt",
                content: mnemonicPhrase,
              });
              emitMetric(METRIC_NAMES.accountCreatorMnemonicDownloadPhrase);
            }}
          >
            <TextLink>DOWNLOAD</TextLink>
            <img src={DownloadIcon} alt="download button" />
          </ActionButton>
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
      </div>
    </div>
  </>
);
