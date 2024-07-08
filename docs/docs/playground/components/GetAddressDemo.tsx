import React, { useState } from "react";
import { getAddress } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetAddressDemo = () => {
  const [publicKeyResult, setPublicKeyResult] = useState("");

  const btnHandler = async () => {
    let address;

    address = await getAddress();

    if ("error" in address) {
      setPublicKeyResult(JSON.stringify(address.error));
    } else {
      setPublicKeyResult(address.address);
    }
  };

  return (
    <section>
      <div>
        What is your wallet address?
        <PlaygroundInput readOnly value={publicKeyResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Get Address
      </button>
    </section>
  );
};
