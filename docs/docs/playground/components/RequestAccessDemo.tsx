import React, { useState } from "react";
import { requestAccess } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const RequestAccessDemo = () => {
  const [publicKeyResult, setPublicKeyResult] = useState("");

  const btnHandler = async () => {
    const access = await requestAccess();

    if (access.error) {
      setPublicKeyResult(JSON.stringify(access.error));
    } else {
      setPublicKeyResult(access.address);
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
