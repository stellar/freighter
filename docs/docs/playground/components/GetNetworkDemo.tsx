import React, { useState } from "react";
import { getNetwork } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const GetNetworkDemo = () => {
  const [networkResult, setNetworkResult] = useState("");
  const [networkPassphraseResult, setNetworkPhraseResult] = useState("");

  const btnHandler = async () => {
    const network = await getNetwork();

    if (network.error) {
      setNetworkResult(JSON.stringify(network.error));
    } else {
      setNetworkResult(network.network);
      setNetworkPhraseResult(network.networkPassphrase);
    }
  };

  return (
    <section>
      <div>
        What network is Freighter using?
        <PlaygroundInput readOnly value={networkResult} />
      </div>
      <div>
        What network passphrase is Freighter using?
        <PlaygroundInput readOnly value={networkPassphraseResult} />
      </div>
      <button type="button" onClick={btnHandler}>
        Get Network
      </button>
    </section>
  );
};
