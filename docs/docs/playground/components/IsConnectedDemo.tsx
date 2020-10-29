import React, { useState } from "react";
import { isConnected } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const IsConnectedDemo = () => {
  const [isConnectedState, setIsConnectedState] = useState(" ");
  const btnHandler = () => {
    setIsConnectedState(isConnected().toString());
  };
  return (
    <section>
      <div>
        Is Freighter currently connected to your browser?
        <PlaygroundInput readOnly value={isConnectedState} />
      </div>
      <button type="button" onClick={btnHandler}>
        Check Connection
      </button>
    </section>
  );
};
