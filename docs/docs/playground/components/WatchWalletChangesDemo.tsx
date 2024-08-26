import React, { useState, useRef } from "react";
import { WatchWalletChanges } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const WatchWalletChangesDemo = () => {
  const [publicKeyResult, setPublicKeyResult] = useState("");
  const [networkResult, setNetworkResult] = useState("");
  const [networkPassphrase, setNetworkPassphrase] = useState("");
  const [isWatching, setIsWatching] = useState(false);

  const Watcher = new WatchWalletChanges(1000);
  const watcherRef = useRef(Watcher);

  const btnHandler = async () => {
    if (isWatching) {
      watcherRef.current.stop();
      setIsWatching(false);
    } else {
      watcherRef.current.watch((result) => {
        setPublicKeyResult(result.address);
        setNetworkResult(result.network);
        setNetworkPassphrase(result.networkPassphrase);
      });
      setIsWatching(true);
    }
  };

  return (
    <section>
      <div>
        What is your wallet address?
        <PlaygroundInput readOnly value={publicKeyResult} />
      </div>
      <div>
        What is your wallet network?
        <PlaygroundInput readOnly value={networkResult} />
      </div>
      <div>
        What is your wallet network passphrase?
        <PlaygroundInput readOnly value={networkPassphrase} />
      </div>
      <button type="button" onClick={btnHandler}>
        {isWatching ? "Stop watching" : "Start watching"}
      </button>
    </section>
  );
};
