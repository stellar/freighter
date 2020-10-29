import React, { useState } from "react";
import { getPublicKey } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetPublicKeyDemo = () => {
  const [publicKeyResult, setPublicKeyResult] = useState("");

  const btnHandler = async () => {
    let publicKey;
    let error = "";

    try {
      publicKey = await getPublicKey();
    } catch (e) {
      error = e;
    }

    setPublicKeyResult(publicKey || error);
  };

  return (
    <section>
      <div>
        What is your public key?
        <PlaygroundInput readOnly value={publicKeyResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Get Public Key
      </button>
    </section>
  );
};
