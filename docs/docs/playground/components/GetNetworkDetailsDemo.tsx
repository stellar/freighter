import React, { useState } from "react";
import { getNetworkDetails } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetNetworkDetailsDemo = () => {
  const [networkDetailsResult, setNetworkDetailsResult] = useState("");

  const btnHandler = async () => {
    let networkDetails;
    let error = "";

    try {
      networkDetails = await getNetworkDetails();
    } catch (e) {
      error = e;
    }

    setNetworkDetailsResult(JSON.stringify(networkDetails) || error);
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
