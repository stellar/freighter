import React, { useState } from "react";
import { getNetwork } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetNetworkDemo = () => {
  const [networkResult, setNetworkResult] = useState("");

  const btnHandler = async () => {
    let networkDetails;
    let error = "";

    try {
      networkDetails = await getNetwork();
    } catch (e) {
      error = e;
    }

    setNetworkResult(JSON.stringify(networkDetails) || error);
  };

  return (
    <section>
      <div>
        What network is Freighter using?
        <PlaygroundInput readOnly value={networkResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Get Network
      </button>
    </section>
  );
};
