import React, { useEffect, useState } from "react";

import { getMigratedMnemonicPhrase } from "@shared/api/internal";

import { ConfirmMnemonicPhrase } from "popup/components/mnemonicPhrase/ConfirmMnemonicPhrase";
import { DisplayMnemonicPhrase } from "popup/components/mnemonicPhrase/DisplayMnemonicPhrase";
import { Onboarding } from "popup/components/Onboarding";

import "./styles.scss";

export const MnemonicPhrase = () => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  useEffect(() => {
    const fetchMnemonicPhrase = async () => {
      const { mnemonicPhrase: migratedMnemonicPhrase } =
        await getMigratedMnemonicPhrase();

      setMnemonicPhrase(migratedMnemonicPhrase);
    };
    fetchMnemonicPhrase();
  }, []);

  return isConfirmed ? (
    <Onboarding layout="full" customWidth="31rem">
      <div className="MigrationMnemonicPhrase">
        <ConfirmMnemonicPhrase isMigration mnemonicPhrase={mnemonicPhrase} />
      </div>
    </Onboarding>
  ) : (
    <Onboarding layout="full">
      <div className="MigrationMnemonicPhrase--display">
        <DisplayMnemonicPhrase
          mnemonicPhrase={mnemonicPhrase}
          setIsConfirmed={setIsConfirmed}
        />
      </div>
    </Onboarding>
  );
};
