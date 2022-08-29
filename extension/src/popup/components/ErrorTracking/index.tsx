import { useSelector } from "react-redux";
import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

import { settingsDataSharingSelector } from "popup/ducks/settings";

export const ErrorTracking = () => {
  const isDataSharingAllowed = useSelector(settingsDataSharingSelector);

  if (process.env.SENTRY_KEY && isDataSharingAllowed) {
    Sentry.init({
      dsn: process.env.SENTRY_KEY,
      release: `freighter@${process.env.npm_package_version}`,
      integrations: [new Integrations.BrowserTracing()],
      tracesSampleRate: 1.0,
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
