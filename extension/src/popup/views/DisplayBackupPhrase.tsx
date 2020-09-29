import React, { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";

import { POPUP_WIDTH } from "constants/dimensions";
import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { download } from "popup/helpers/download";
import { navigateTo } from "popup/helpers/navigateTo";

import { Button } from "popup/basics/Buttons";

import { Toast } from "popup/components/Toast";
import { ActionButton } from "popup/components/mnemonicPhrase/ActionButton";
import { WarningMessage } from "popup/components/WarningMessage";

import {
  HeaderContainerEl,
  HeaderEl,
  BackButtonEl,
} from "popup/views/UnlockBackupPhrase";

import OrangeLockIcon from "popup/assets/icon-orange-lock.svg";
import DownloadColorIcon from "popup/assets/download-color.svg";
import CopyColorIcon from "popup/assets/copy-color.svg";

const MnemonicDisplayEl = styled.div`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.bold};
  background: ${COLOR_PALETTE.white};
  border: 2px solid ${COLOR_PALETTE.primary};
  border-radius: 20px;
  font-size: 1.125rem;
  margin: 0;
  margin-bottom: 1rem;
  padding: 1rem;
  position: relative;
`;
const DisplayButtonsEl = styled.div`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.bold};
  position: relative;
  text-align: right;

  img {
    width: 1.125rem;
    margin-right: 0.5rem;
    vertical-align: middle;
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
const ButtonRowEl = styled.div`
  padding: 1.15rem 0 0;
`;
const ActionButtonEl = styled(ActionButton)`
  padding: 0 0.75rem;
  color: ${COLOR_PALETTE.primary};
  opacity: 1;
`;
const H3 = styled.h3`
  font-weight: ${FONT_WEIGHT.normal};
  color: ${COLOR_PALETTE.primary};
  font-size: 1.125rem;
  line-height: 2;
  margin: 0;
  padding: 0 2px;
`;

export const DisplayBackupPhrase = () => {
  const mnemonicPhrase = useMnemonicPhrase();
  const [isCopied, setIsCopied] = useState(false);

  return (
    <UnlockAccountEl data-testid="display-mnemonic-phrase">
      <HeaderContainerEl>
        <BackButtonEl onClick={() => navigateTo(ROUTES.account)} />
        <HeaderEl>Show backup phrase</HeaderEl>
      </HeaderContainerEl>
      <WarningMessage
        icon={OrangeLockIcon}
        subheader="Keep your phrase in a safe place"
      >
        <p>Your backup phrase is the only way to recover your account.</p>
        <p>
          Anyone who has access to your phrase has access to your account and to
          the funds in it, so keep it noted in a safe place.
        </p>
      </WarningMessage>
      <H3>Your backup phrase:</H3>
      <MnemonicDisplayEl>{mnemonicPhrase}</MnemonicDisplayEl>
      <DisplayButtonsEl>
        <ActionButtonEl
          data-testid="download"
          onClick={() => {
            download({
              filename: "lyraMnemonicPhrase.txt",
              content: mnemonicPhrase,
            });
            emitMetric(METRIC_NAMES.backupPhraseDownload);
          }}
        >
          <img src={DownloadColorIcon} alt="download button" />
          Download
        </ActionButtonEl>
        <CopyToClipboard
          data-testid="copy"
          text={mnemonicPhrase}
          onCopy={() => {
            setIsCopied(true);
            emitMetric(METRIC_NAMES.backupPhraseCopy);
          }}
        >
          <ActionButtonEl>
            <img src={CopyColorIcon} alt="copy button" />
            Copy
          </ActionButtonEl>
        </CopyToClipboard>
        <CopiedToastWrapperEl>
          <Toast
            message="Copied to your clipboard 👌"
            isShowing={isCopied}
            setIsShowing={setIsCopied}
          />
        </CopiedToastWrapperEl>
      </DisplayButtonsEl>
      <ButtonRowEl>
        <Button onClick={() => navigateTo(ROUTES.account)}>Close</Button>
      </ButtonRowEl>
    </UnlockAccountEl>
  );
};
