import React, { useState } from "react";
import { isAllowed } from "@stellar/freighter-api";
import { PlaygroundInput } from "./basics/inputs";

export const IsAllowedDemo = () => {
  const [isAllowedState, setIsAllowedState] = useState(" ");
  const btnHandler = async () => {
    setIsAllowedState((await isAllowed()).toString());
  };
  return (
    <section>
      <div>
        Is Freighter allowed to transmit data to this dapp?
        <PlaygroundInput readOnly value={isAllowedState} />
      </div>
      <button type="button" onClick={btnHandler}>
        Check Allowed Status
      </button>
    </section>
  );
};
