import React, { useState } from "react";
import { requestAccess } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const RequestAccessDemo = () => {
  const [publicKeyResult, setPublicKeyResult] = useState("");

  const btnHandler = async () => {
    const address = await requestAccess();

    if ("error" in address) {
      setPublicKeyResult(JSON.stringify(address.error));
    } else {
      setPublicKeyResult(address.address);
    }
  };

  return (
    <section>
      <div>
        What is your public key?
        <PlaygroundInput readOnly value={publicKeyResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Request Access
      </button>
    </section>
  );
};
