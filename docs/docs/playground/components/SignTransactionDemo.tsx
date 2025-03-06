import { signTransaction } from "@stellar/freighter-api";
import React, { useState } from "react";
import { PlaygroundInput, PlaygroundTextarea } from "./basics/inputs";

export const SignTransactionDemo = () => {
  const [transactionXdr, setTransactionXdr] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [transactionResult, setTransactionResult] = useState("");
  const [signerAddressResult, setSignerAddressResult] = useState("");
  const [signatureResult, setSignatureResult] = useState("");

  const xdrOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTransactionXdr(e.currentTarget.value);
  };
  const networkPassphraseOnChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setNetworkPassphrase(e.currentTarget.value);
  };
  const publicKeyOnChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPublicKey(e.currentTarget.value);
  };

  const btnHandler = async () => {
    let signedTransaction;

    signedTransaction = await signTransaction(transactionXdr, {
      address: publicKey,
      networkPassphrase,
    });

    if (signedTransaction.error) {
      setTransactionResult(JSON.stringify(signedTransaction.error));
    } else {
      setTransactionResult(signedTransaction.signedTxXdr);
      setSignerAddressResult(signedTransaction.signerAddress);
      setSignatureResult(signedTransaction.signature || "");
    }
  };
  return (
    <section>
      <div>
        Enter transaction XDR:
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
        <PlaygroundTextarea readOnly value={transactionResult} />
        Signer address:
        <PlaygroundInput readOnly value={signerAddressResult} />
        Signature:
        <PlaygroundTextarea readOnly value={signatureResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Sign Transaction XDR
      </button>
    </section>
  );
};
