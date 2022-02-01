import React from "react";
import styled from "styled-components";

import { emitMetric } from "helpers/metrics";

import DownloadIcon from "popup/assets/download.svg";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { download } from "popup/helpers/download";
import { SubmitButton } from "popup/basics/Forms";

import { ActionButton } from "./ActionButton";

import { InfoBlock, CopyText } from "@stellar/design-system";

import { FullscreenStyle } from "popup/components/FullscreenStyle";

// ALEC TODO - make card?
const MnemonicDisplayEl = styled.div`
  background: var(--pal-background-secondary);
  border-radius: 8px;
  color: var(--pal-text-primary)
  font-size: 1.125rem;
  margin: 2rem 0 1rem;
  padding: 1.68rem 2.31rem;
  position: relative;
  text-align: center;
`;

const OrderedList = styled.ol`
  columns: 2;
  text-align: start;
  counter-reset: item;
  list-style-type: none;

  li {
    padding-left: 1rem;
  }

  li::before {
    color: var(--pal-text-tertiary);
    content: none;
    counter-increment: item;
    content: counter(item);
  }
`;

const DisplayButtonsEl = styled.div`
  margin-bottom: 2.5rem;
  margin-right: 1rem;
  position: relative;
  text-align: right;

  img {
    margin-left: 0.5rem;
  }
`;

const Screen = styled.div`
  display: flex;
  flex-flow: row wrap;
  align-content: center;
  justify-content: space-between;
  // TODO - use HEADER_HEIGHT constant
  height: calc(100vh - 119px);
  max-height: 40rem;
  max-width: 57rem;
  width: 100%;
  margin: auto;
`;

// ALEC TODO - move to scss file
const HalfScreen = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 0 2rem 1.55rem;
  width: 27rem;
`;

export const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
  setReadyToConfirm,
}: {
  mnemonicPhrase: string;
  setReadyToConfirm: (readyState: boolean) => void;
}) => {
  return (
    <>
      <FullscreenStyle />
      <Screen>
        <HalfScreen>
          Secret Recovery phrase
          <p>
            Your recovery phrase gives you access to your account and is the{" "}
            <strong>only way to access it in a new browser</strong>. Keep it in
            a safe place.
          </p>
          <p>
            For your security, we'll check if you got it right in the next step.
          </p>
        </HalfScreen>
        <HalfScreen data-testid="display-mnemonic-phrase">
          <InfoBlock variant={InfoBlock.variant.warning}>
            <strong>Important Warning</strong>
            <p>Never disclose your recovery phrase!</p>
          </InfoBlock>
          <MnemonicDisplayEl>
            <OrderedList>
              {mnemonicPhrase.split(" ").map((word: string) => (
                <li>
                  <strong>{word}</strong>
                </li>
              ))}
            </OrderedList>
          </MnemonicDisplayEl>
          <DisplayButtonsEl>
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
              Download
              <img src={DownloadIcon} alt="download button" />
            </ActionButton>
            <CopyText textToCopy={mnemonicPhrase} showCopyIcon showTooltip>
              COPY
            </CopyText>
          </DisplayButtonsEl>
          <SubmitButton
            data-testid="confirm"
            onClick={() => {
              setReadyToConfirm(true);
            }}
          >
            Next
          </SubmitButton>
        </HalfScreen>
      </Screen>
    </>
  );
};
