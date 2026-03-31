import { useCallback, useEffect, useState } from "react";
import browser from "webextension-polyfill";

const STORAGE_KEY = "hasSeenDiscoverWelcome";

export const useDiscoverWelcome = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const checkWelcome = async () => {
      const result = await browser.storage.local.get(STORAGE_KEY);
      if (!result[STORAGE_KEY]) {
        setShowWelcome(true);
      }
    };
    checkWelcome();
  }, []);

  const dismissWelcome = useCallback(async () => {
    setShowWelcome(false);
    await browser.storage.local.set({ [STORAGE_KEY]: true });
  }, []);

  return { showWelcome, dismissWelcome };
};
