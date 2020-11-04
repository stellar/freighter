import React, { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";

import { emitMetric } from "helpers/metrics";

import DownloadIcon from "popup/assets/download.svg";
import CopyIcon from "popup/assets/copy.svg";
import { COLOR_PALETTE } from "popup/constants/styles";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { download } from "popup/helpers/download";
import { BasicButton } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";

import { HalfScreen } from "popup/components/Onboarding";
import { Toast } from "popup/components/Toast";
import { ActionButton } from "./ActionButton";

const MnemonicDisplayEl = styled.div`
  background: ${COLOR_PALETTE.primaryGradient};
  border-radius: 30px;
  color: ${({ isBlurred }: { isBlurred: boolean }) =>
    isBlurred ? "transparent" : "#fff"};
  font-size: 1.125rem;
  margin: 2rem 0 1rem;
  padding: 1.68rem 2.31rem;
  position: relative;
  text-align: center;
  text-shadow: ${({ isBlurred }: { isBlurred: boolean }) =>
    isBlurred ? "0 0 5px rgba(0, 0, 0, 0.5)" : "none"};
`;

const DisplayTooltipEl = styled(BasicButton)`
  color: ${COLOR_PALETTE.white};
  font-size: 1rem;
  position: absolute;
  text-shadow: none;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
const CopiedToastWrapperEl = styled.div`
  right: 15.625rem;
  position: absolute;
`;

export const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
  setReadyToConfirm,
}: {
  mnemonicPhrase: string;
  setReadyToConfirm: (readyState: boolean) => void;
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isBlurred, setIsBlurred] = useState(true);

  return (
    <HalfScreen data-testid="display-mnemonic-phrase">
      <p>
        Your backup phrase gives you access to your account and is the only way
        to restore it in a new browser. We do not store and cannot help you
        recover your backup phrase or get you access to your account, so please
        keep your backup phrase in a safe and secure place and don't share it
        with anyone. If you lose your backup phrase, you will permanently lose
        access to your account.
      </p>
      <p>
        For your security, we will ask you to confirm your backup phrase in the
        next step.
      </p>
      <MnemonicDisplayEl isBlurred={isBlurred}>
        {isBlurred ? (
          <DisplayTooltipEl
            data-testid="show"
            onClick={() => {
              setIsBlurred(false);
              emitMetric(METRIC_NAMES.accountCreatorMnemonicViewPhrase);
            }}
          >
            Show backup phrase
          </DisplayTooltipEl>
        ) : null}
        {mnemonicPhrase}
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
        <CopyToClipboard
          data-testid="copy"
          text={mnemonicPhrase}
          onCopy={() => {
            setIsCopied(true);
            emitMetric(METRIC_NAMES.accountCreatorMnemonicCopyPhrase);
          }}
        >
          <ActionButton>
            Copy
            <img src={CopyIcon} alt="copy button" />
          </ActionButton>
        </CopyToClipboard>
        <CopiedToastWrapperEl>
          <Toast
            message="Copied to your clipboard 👌"
            isShowing={isCopied}
            setIsShowing={setIsCopied}
          />
        </CopiedToastWrapperEl>
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
  );
};
