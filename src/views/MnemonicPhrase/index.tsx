import React, { useState } from "react";
import ConfirmMnemonicPhrase from "components/mnemonicPhrase/ConfirmMnemonicPhrase";
import useMnemonicPhrase from "hooks/useMnemonicPhrase";
import DisplayMnemonicPhrase from "components/mnemonicPhrase/DisplayMnemonicPhrase";
import Fullscreen from "components/Layout/Fullscreen";

import spy from "assets/spy.png";

const MnemonicPhrase = () => {
  const [readyToConfirm, setReadyToConfirm] = useState(false);

  const mnemonicPhrase = useMnemonicPhrase();

  return (
    <Fullscreen header="Secret backup phrase" icon={[spy, "Spy"]}>
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
    </Fullscreen>
  );
};

export default MnemonicPhrase;
