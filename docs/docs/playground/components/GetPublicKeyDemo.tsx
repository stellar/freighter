import React, { useState } from "react";
import { getPublicKey } from "@stellar/lyra-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetPublicKeyDemo = () => {
  const [publicKeyResult, setPublicKeyResult] = useState("");
  const btnHandler = async () => {
    let res = { publicKey: "", error: "" };
    try {
      res = await getPublicKey();
    } catch (e) {
      res = e;
    }
    const { publicKey, error } = res;
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
