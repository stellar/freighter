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
      try {
        const seen = await getHasSeenDiscoverWelcome();
        if (!seen) {
          setShowWelcome(true);
        }
      } catch (error) {
        // Default to hiding the modal on messaging failure so we never
        // show it to a user who has already dismissed it.
        captureException(`Error checking Discover welcome flag - ${error}`);
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
