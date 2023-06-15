import React, { useState } from "react";
import { setAllowed } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const SetAllowedDemo = () => {
  const [allowedState, setAllowedState] = useState(" ");
  const btnHandler = async () => {
    setAllowedState((await setAllowed()).toString());
  };
  return (
    <section>
      <div>
        Allow Freigher to transmit data to this dapp?
        <PlaygroundInput readOnly value={allowedState} />
      </div>
      <button type="button" onClick={btnHandler}>
        Set Allowed Status
      </button>
    </section>
  );
};
