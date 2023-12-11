import React, { useState } from "react";
import { signAuthEntry } from "@stellar/freighter-api";
import { PlaygroundTextarea } from "./basics/inputs";

export const SignAuthEntryDemo = () => {
  const [entryXdr, setEntryXdr] = useState("");
  const [result, setResult] = useState("");

  const xdrOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEntryXdr(e.currentTarget.value);
  };

  const btnHandler = async () => {
    let signedAuthEntry;
    let error = "";

    try {
      signedAuthEntry = await signAuthEntry(entryXdr);
    } catch (e) {
      error = e;
    }
    setResult(JSON.stringify(signedAuthEntry) || error);
  };

  return (
    <section>
      <div>
        Enter entry preimage XDR:
        <PlaygroundTextarea onChange={xdrOnChangeHandler} />
      </div>
      <div>
        Result:
        <PlaygroundTextarea readOnly value={result} />
      </div>
      <button type="button" onClick={btnHandler}>
        Sign Authorization Entry XDR
      </button>
    </section>
  );
};
