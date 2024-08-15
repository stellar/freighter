import React, { useState } from "react";
import { signAuthEntry } from "@stellar/freighter-api";
import { PlaygroundTextarea, PlaygroundInput } from "./basics/inputs";

export const SignAuthEntryDemo = () => {
  const [entryXdr, setEntryXdr] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [result, setResult] = useState("");
  const [signerAddressResult, setSignerAddressResult] = useState("");

  const xdrOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntryXdr(e.currentTarget.value);
  };
  const networkPassphraseOnChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNetworkPassphrase(e.currentTarget.value);
  };
  const publicKeyOnChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPublicKey(e.currentTarget.value);
  };

  const btnHandler = async () => {
    const signedAuthEntryObj = await signAuthEntry(entryXdr, {
      address: publicKey,
      networkPassphrase,
    });

    if (signedAuthEntryObj.error) {
      setResult(JSON.stringify(signedAuthEntryObj.error));
    } else {
      setResult(JSON.stringify(signedAuthEntryObj.signedAuthEntry));
      setSignerAddressResult(signedAuthEntryObj.signerAddress);
    }
  };

  return (
    <section>
      <div>
        Enter entry preimage XDR:
        <PlaygroundTextarea onChange={xdrOnChangeHandler} />
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
        Sign Authorization Entry XDR
      </button>
    </section>
  );
};
