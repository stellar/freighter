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
    Sentry.close(500);
  }

  return null;
};
