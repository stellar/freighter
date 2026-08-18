import * as Sentry from "@sentry/browser";
import { FetchError } from "./fetch";

/**
 * Sentry's default `captureException` only reads `error.message` + stack and
 * does not enumerate own-properties on Error subclasses into searchable
 * tags/contexts. This helper unpacks `FetchError` so its HTTP fields are
 * filterable in Sentry (e.g. `http.status:429`) and the response body flows
 * through Sentry's data scrubbers via `setContext`.
 */
export const captureFetchError = (err: unknown): void => {
  if (err instanceof FetchError) {
    Sentry.withScope((scope) => {
      scope.setTag("http.status", String(err.status));
      scope.setTag("http.method", err.method);
      scope.setTag("http.kind", err.kind);
      scope.setContext("http", {
        url: err.url,
        method: err.method,
        status: err.status,
        statusText: err.statusText,
        body: err.body,
        kind: err.kind,
      });
      Sentry.captureException(err);
    });
    return;
  }
  Sentry.captureException(err);
};
