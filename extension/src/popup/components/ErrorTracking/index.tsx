import { useSelector } from "react-redux";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

import { SENTRY_KEY } from "constants/env";
import { settingsDataSharingSelector } from "popup/ducks/settings";
import packageJson from "../../../../package.json";

export const ErrorTracking = () => {
  const isDataSharingAllowed = useSelector(settingsDataSharingSelector);

  if (SENTRY_KEY && isDataSharingAllowed) {
    Sentry.init({
      dsn: SENTRY_KEY,
      release: `freighter@${packageJson.version}`,
      integrations: [new Integrations.BrowserTracing()],
      tracesSampleRate: 1.0,
      denyUrls: [
        // Amplitude 4xx's on too many Posts, which is expected behavior
        /api\.amplitude\.com/i,
      ],
    });
  }

  if (!isDataSharingAllowed) {
    /* 
    Note: Sentry.close does not completely disable calls to Sentry. Sentry will still report, but with a completely anonymized payload. 
    When you refresh/reopen the app after disabling tracking, it will not initialize Sentry, thus disabling *all* calls to Sentry
    */

    Sentry.close(500);
  }

  return null;
};
