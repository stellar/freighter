import React, { useState } from "react";
import { signTransaction } from "@stellar/lyra-api";
import { PlaygroundTextarea } from "./basics/inputs";

export const SignTransactionDemo = () => {
  const [transactionXdr, setTransactionXdr] = useState("");
  const [transactionResult, setTransactionResult] = useState("");
  const inputOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTransactionXdr(e.currentTarget.value);
  };
  const btnHandler = async () => {
    let signedTransaction;
    let error = "";

    try {
      signedTransaction = await signTransaction(transactionXdr);
    } catch (e) {
      error = e;
    }
    setTransactionResult(signedTransaction || error);
  };
  return (
    <section>
      <div>
        Enter transaction XDR:
        <PlaygroundTextarea onChange={inputOnChangeHandler} />
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
