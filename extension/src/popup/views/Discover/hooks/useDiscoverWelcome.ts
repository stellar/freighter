import { useCallback, useEffect, useState } from "react";
import { captureException } from "@sentry/browser";

import {
  getHasSeenDiscoverWelcome,
  dismissDiscoverWelcome as dismissDiscoverWelcomeApi,
} from "@shared/api/internal";

export const useDiscoverWelcome = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const checkWelcome = async () => {
      const seen = await getHasSeenDiscoverWelcome();
      if (!seen) {
        setShowWelcome(true);
      }
    };
    checkWelcome();
  }, []);

  const dismissWelcome = useCallback(async () => {
    setShowWelcome(false);
    try {
      await dismissDiscoverWelcomeApi();
    } catch (error) {
      captureException(`Error dismissing Discover welcome modal - ${error}`);
    }
  }, []);

  return { showWelcome, dismissWelcome };
};
