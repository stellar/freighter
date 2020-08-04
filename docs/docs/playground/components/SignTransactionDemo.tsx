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
    let res = { transactionStatus: "", error: "" };
    try {
      res = await signTransaction({ transactionXdr });
    } catch (e) {
      res = e;
    }
    const { transactionStatus, error } = res;
    setTransactionResult(transactionStatus || error);
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
