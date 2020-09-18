import React, { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";

import { POPUP_WIDTH } from "constants/dimensions";
import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE } from "popup/constants/styles";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { download } from "popup/helpers/download";
import { navigateTo } from "popup/helpers/navigateTo";

import { BasicButton, BackButton } from "popup/basics/Buttons";

import { Toast } from "popup/components/Toast";
import { ActionButton } from "popup/components/mnemonicPhrase/ActionButton";

import { HeaderContainerEl, HeaderEl } from "popup/views/UnlockBackupPhrase";

import Download from "popup/assets/download.png";
import Copy from "popup/assets/copy.png";

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
const UnlockAccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2rem 2.5rem;
`;

export const DisplayBackupPhrase = () => {
  const mnemonicPhrase = useMnemonicPhrase();
  const [isCopied, setIsCopied] = useState(false);
  const [isBlurred, setIsBlurred] = useState(true);

  return (
    <UnlockAccountEl data-testid="display-mnemonic-phrase">
      <HeaderContainerEl>
        <HeaderEl>
          <BackButton onClick={() => navigateTo(ROUTES.account)} />
          Show backup phrase
        </HeaderEl>
      </HeaderContainerEl>
      <p>
        Your phrase is the only way to access your account on a new computer.
        Anyone who has access to your phrase has access to your account, so keep
        it noted in a safe place.
      </p>
      <MnemonicDisplayEl isBlurred={isBlurred}>
        {isBlurred ? (
          <DisplayTooltipEl
            data-testid="show"
            onClick={() => {
              setIsBlurred(false);
              emitMetric(METRIC_NAMES.backupPhraseViewed);
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
              filename: "lyraMnemonicPhrase.txt",
              content: mnemonicPhrase,
            });
            emitMetric(METRIC_NAMES.backupPhraseDownload);
          }}
        >
          Download
          <img src={Download} alt="Download button" />
        </ActionButton>
        <CopyToClipboard
          data-testid="copy"
          text={mnemonicPhrase}
          onCopy={() => {
            setIsCopied(true);
            emitMetric(METRIC_NAMES.backupPhraseCopy);
          }}
        >
          <ActionButton>
            Copy
            <img src={Copy} alt="copy button" />
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
    </UnlockAccountEl>
  );
};
