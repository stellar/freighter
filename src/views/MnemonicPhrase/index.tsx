import React, { useState } from "react";
import ConfirmMnemonicPhrase from "components/mnemonicPhrase/ConfirmMnemonicPhrase";
import useMnemonicPhrase from "hooks/useMnemonicPhrase";
import DisplayMnemonicPhrase from "components/mnemonicPhrase/DisplayMnemonicPhrase";

const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  return (
    <>
      {readyToConfirm ? (
        <ConfirmMnemonicPhrase
          mnemonicPhrase={mnemonicPhrase}
          setReadyToConfirm={setReadyToConfirm}
        />
      ) : (
        <DisplayMnemonicPhrase
          mnemonicPhrase={mnemonicPhrase}
          setReadyToConfirm={setReadyToConfirm}
        />
      )}
    </>
  );
};

export default MnemonicPhrase;
