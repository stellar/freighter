import { useEffect, useState } from "react";
import { getMnemonicPhrase } from "@shared/api/internal";

export const useMnemonicPhrase = () => {
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  useEffect(() => {
    let res = { mnemonicPhrase: "" };

    const fetchMnemonicPhrase = async () => {
      try {
        res = await getMnemonicPhrase();
      } catch (e) {
        console.error(e);
      }

      const { mnemonicPhrase: fetchedMnemonicPhrase } = res;
      setMnemonicPhrase(fetchedMnemonicPhrase);
    };

    fetchMnemonicPhrase();

    return () => {
      setMnemonicPhrase("");
    };
  }, []);

  return mnemonicPhrase;
};
