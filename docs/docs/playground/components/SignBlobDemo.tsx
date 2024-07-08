import React, { useState } from "react";
import { signMessage } from "@stellar/freighter-api";
import { PlaygroundTextarea } from "./basics/inputs";

export const SignBlobDemo = () => {
  const [b64blob, setB64blob] = useState("");
  const [result, setResult] = useState("");

  const blobOnChangeHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setB64blob(e.currentTarget.value);
  };

  const btnHandler = async () => {
    let signedBlob;

    signedBlob = await signMessage(b64blob);

    if ("error" in signedBlob) {
      setResult(JSON.stringify(signedBlob.error));
    } else {
      console.log(signedBlob.signedMessage.toString());
      setResult(signedBlob.signedMessage);
      // setSignerAddressResult(signedTransaction.signerAddress);
    }
  };
  return (
    <section>
      <div>
        Enter base 64 encoded blob:
        <PlaygroundTextarea onChange={blobOnChangeHandler} />
      </div>
      <div>
        Result:
        <PlaygroundTextarea readOnly value={result} />
      </div>
      <button type="button" onClick={btnHandler}>
        Sign blob
      </button>
    </section>
  );
};
