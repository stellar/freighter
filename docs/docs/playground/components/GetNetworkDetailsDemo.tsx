import React, { useState } from "react";
import { getNetworkDetails } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetNetworkDetailsDemo = () => {
  const [networkDetailsResult, setNetworkDetailsResult] = useState("");

  const btnHandler = async () => {
    const networkDetailsObj = await getNetworkDetails();

    if (networkDetailsObj.error) {
      setNetworkDetailsResult(JSON.stringify(networkDetailsObj.error));
    } else {
      setNetworkDetailsResult(JSON.stringify(networkDetailsObj));
    }
  };

  return (
    <section>
      <div>
        What network is Freighter using?
        <PlaygroundInput readOnly value={networkDetailsResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Get Network Details
      </button>
    </section>
  );
};
