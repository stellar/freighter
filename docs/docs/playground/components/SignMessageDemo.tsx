import React, { useState } from "react";
import { signMessage } from "@stellar/freighter-api";
import { PlaygroundTextarea, PlaygroundInput } from "./basics/inputs";

export const SignMessageDemo = () => {
  const [message, setMessage] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [result, setResult] = useState("");
  const [signerAddressResult, setSignerAddressResult] = useState("");
  const networkPassphraseOnChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNetworkPassphrase(e.currentTarget.value);
  };
  const publicKeyOnChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPublicKey(e.currentTarget.value);
  };

  const blobOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.currentTarget.value);
  };

  const btnHandler = async () => {
    const signedMessageObj = await signMessage(message, {
      address: publicKey,
      networkPassphrase,
    });

    if (signedMessageObj.error) {
      setResult(JSON.stringify(signedMessageObj.error));
    } else {
      setResult(JSON.stringify(signedMessageObj.signedMessage));
      setSignerAddressResult(signedMessageObj.signerAddress);
    }
  };
  return (
    <section>
      <div>
        Enter message to sign:
        <PlaygroundTextarea onChange={blobOnChangeHandler} />
      </div>
      <div>
        Enter network passphrase (optional):
        <PlaygroundInput onChange={networkPassphraseOnChangeHandler} />
      </div>
      <div>
        Request signature from specific public key (optional):
        <PlaygroundInput onChange={publicKeyOnChangeHandler} />
      </div>
      <div>
        Result:
        <PlaygroundTextarea readOnly value={result} />
        Signer address:
        <PlaygroundInput readOnly value={signerAddressResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Sign message
      </button>
    </section>
  );
};
