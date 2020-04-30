import React, { useState, useEffect } from "react";
import CopyToClipboard from "react-copy-to-clipboard";

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
      <h1>Secret backup Phrase</h1>
      <p>{mnemonicPhrase}</p>
      <CopyToClipboard text={mnemonicPhrase} onCopy={() => setCopied(true)}>
        <button>Copy to clopboard with button</button>
      </CopyToClipboard>
      <button onClick={downloadPhrase}>Download phrase</button>
      {copied ? <span>Copied!</span> : null}
      <button
        onClick={() => {
          setReadyToConfirm(true);
        }}
      >
        Next
      </button>
    </>
  );
};

export default DisplayMnemonicPhrase;
