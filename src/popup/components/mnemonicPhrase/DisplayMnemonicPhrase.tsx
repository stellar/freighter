import React, { useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";

import Download from "popup/assets/download.png";
import Copy from "popup/assets/copy.png";
import { COLOR_PALETTE } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";

import { HalfScreen } from "popup/components/Onboarding";
import { Toast } from "popup/components/Toast";
import { ActionButton } from "./ActionButton";

const WarningEl = styled.strong`
  color: ${COLOR_PALETTE.primary};
`;

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

  const downloadPhrase = () => {
    const el = document.createElement("a");
    const file = new Blob([mnemonicPhrase], { type: "text/plain" });
    el.href = URL.createObjectURL(file);
    el.download = "lyraMnemonicPhrase.txt";
    document.body.appendChild(el);
    el.click();
  };
  return (
    <HalfScreen>
      <p>
        Your secret backup phrase makes it easy to back up and restore your
        account.
      </p>
      <p>
        <WarningEl>WARNING:</WarningEl> Never disclose your backup phase.
      </p>
      <MnemonicDisplayEl isBlurred={isBlurred}>
        {isBlurred ? (
          <DisplayTooltipEl onClick={() => setIsBlurred(false)}>
            Show backup phrase
          </DisplayTooltipEl>
        ) : null}
        {mnemonicPhrase}
      </MnemonicDisplayEl>
      <DisplayButtonsEl>
        <ActionButton onClick={downloadPhrase}>
          Download
          <img src={Download} alt="Download button" />
        </ActionButton>
        <CopyToClipboard text={mnemonicPhrase} onCopy={() => setIsCopied(true)}>
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
      <SubmitButton
        onClick={() => {
          setReadyToConfirm(true);
        }}
      >
        Next
      </SubmitButton>
    </HalfScreen>
  );
};
