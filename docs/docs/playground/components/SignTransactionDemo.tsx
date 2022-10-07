import React, { useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import { PlaygroundInput, PlaygroundTextarea } from "./basics/inputs";

export const SignTransactionDemo = () => {
  const [transactionXdr, setTransactionXdr] = useState("");
  const [network, setNetwork] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [transactionResult, setTransactionResult] = useState("");

  const xdrOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTransactionXdr(e.currentTarget.value);
  };
  const networkOnChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNetwork(e.currentTarget.value);
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
    let signedTransaction;
    let error = "";

    try {
      signedTransaction = await signTransaction(transactionXdr, {
        network,
        accountToSign: publicKey,
        networkPassphrase,
      });
    } catch (e) {
      error = e;
    }
    setTransactionResult(signedTransaction || error);
  };
  return (
    <section>
      <div>
        Enter transaction XDR:
        <PlaygroundTextarea onChange={xdrOnChangeHandler} />
      </div>
      <div>
        Enter network - "TESTNET"|"PUBLIC"|"FUTURENET" (optional):
        <PlaygroundInput onChange={networkOnChangeHandler} />
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
      </div>
      <button type="button" onClick={btnHandler}>
        Sign Transaction XDR
      </button>
    </section>
  );
};
