import { addToken } from "@stellar/freighter-api";
import React, { useState } from "react";
import { PlaygroundInput, PlaygroundTextarea } from "./basics/inputs";

export const AddTokenDemo = () => {
  const [contractId, setContractId] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [result, setResult] = useState("");

  const contractIdOnChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setContractId(e.currentTarget.value);
  };

  const networkPassphraseOnChangeHandler = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNetworkPassphrase(e.currentTarget.value);
  };

  const btnHandler = async () => {
    let tokenResult;

    tokenResult = await addToken({
      contractId,
      networkPassphrase,
    });

    if (tokenResult.error) {
      setResult(JSON.stringify(tokenResult.error));
    } else {
      setResult("Token info successfully sent.");
    }
  };

  return (
    <section>
      <div>
        Enter Token's Contract Id:
        <PlaygroundInput onChange={contractIdOnChangeHandler} />
      </div>
      <div>
        Enter network passphrase:
        <PlaygroundInput onChange={networkPassphraseOnChangeHandler} />
      </div>
      <div>
        Result:
        <PlaygroundTextarea readOnly value={result} />
      </div>
      <button type="button" onClick={btnHandler}>
        Add Token
      </button>
    </section>
  );
};
