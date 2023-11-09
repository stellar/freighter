import React, { useEffect, useState } from "react";
import shuffle from "lodash/shuffle";

import { getMigratedMnemonicPhrase } from "@shared/api/internal";

import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";

export const MnemonicPhrase = () => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  useEffect(() => {
    const fetchMnemonicPhrase = async () => {
      const {
        mnemonicPhrase: migratedMnemonicPhrase,
      } = await getMigratedMnemonicPhrase();

      setMnemonicPhrase(migratedMnemonicPhrase);
    };
    fetchMnemonicPhrase();
  }, []);

  return isConfirmed ? (
    <ConfirmMnemonicPhrase words={shuffle(mnemonicPhrase.split(" "))} />
  ) : (
    <DisplayMnemonicPhrase
      mnemonicPhrase={mnemonicPhrase}
      setIsConfirmed={setIsConfirmed}
    />
  );
};
