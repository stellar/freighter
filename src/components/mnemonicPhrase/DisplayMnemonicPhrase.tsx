import React, { useState, useEffect } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import { COLOR_PALETTE } from "styles";
import Download from "assets/download.png";
import Copy from "assets/copy.png";
import { FormButton } from "components/form";
import ActionButton from "./basics/ActionButton";

const Warning = styled.strong`
  color: ${COLOR_PALETTE.primary};
`;

const MnemonicDisplay = styled.div`
  background: ${COLOR_PALETTE.primaryGradient};
  border-radius: 30px;
  color: #fff;
  font-size: 1.125 rem;
  line-height: 1.8rem;
  margin: 3.5rem 0 1rem;
  padding: 27px 37px;
  text-align: center;
`;

const DisplayButtons = styled.div`
  margin-right: 1rem;
  text-align: right;

  img {
    margin-left: 0.5rem;
  }
`;

const DisplayMnemonicPhrase = ({
  mnemonicPhrase,
  setReadyToConfirm,
}: {
  mnemonicPhrase: string;
  setReadyToConfirm: (readyState: boolean) => void;
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 5000);
    }
  }, [copied]);

  const downloadPhrase = () => {
    const el = document.createElement("a");
    const file = new Blob([mnemonicPhrase], { type: "text/plain" });
    el.href = URL.createObjectURL(file);
    el.download = "lyraMnemonicPhrase.txt";
    document.body.appendChild(el);
    el.click();
  };

  return (
    <>
      <p>
        Your secret backup phrase makes it easy to back up and restore your
        account.
      </p>
      <p>
        <Warning>WARNING:</Warning> Never disclose your backup phase.
      </p>
      <MnemonicDisplay>{mnemonicPhrase}</MnemonicDisplay>
      <DisplayButtons>
        <ActionButton onClick={downloadPhrase}>
          Download
          <img src={Download} alt="Download button" />
        </ActionButton>
        <CopyToClipboard text={mnemonicPhrase} onCopy={() => setCopied(true)}>
          <ActionButton>
            Copy
            <img src={Copy} alt="copy button" />
          </ActionButton>
        </CopyToClipboard>
        {copied ? <span>Copied!</span> : null}
      </DisplayButtons>
      <FormButton
        onClick={() => {
          setReadyToConfirm(true);
        }}
      >
        Next
      </FormButton>
    </>
  );
};

export default DisplayMnemonicPhrase;
