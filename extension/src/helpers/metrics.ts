import throttle from "lodash/throttle";
import { Middleware, AnyAction } from "redux";
import { createAsyncThunk, createAction } from "@reduxjs/toolkit";

import { store } from "popup/App";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AMPLITUDE_KEY } from "constants/env";
import { settingsDataSharingSelector } from "popup/ducks/settings";
import { AccountType } from "@shared/api/types";
import { captureException } from "@sentry/browser";

type metricHandler<AppState> = (state: AppState, action: AnyAction) => void;
const handlersLookup: { [key: string]: metricHandler<any>[] } = {};

/*
 * metricsMiddleware is a redux middleware that calls handlers specified to
 * respond to a specific action type. For each action dispatched, it gets a list
 * of registered handlers and passes the current state and action. These are
 * intended for metrics emission, nothing else.
 */
export function metricsMiddleware<State>(): Middleware<{}, State> {
  return ({ getState }) => (next) => (action: AnyAction) => {
    const state = getState();
    (handlersLookup[action.type] || []).forEach((handler) =>
      handler(state, action),
    );
    return next(action);
  };
}

// I can't figure out how to get the properties off a thunk for the ActionType
// without creating an intermediate value
const dummyThunk = createAsyncThunk<any, any>("dummy", () => {});
const dummyAction = createAction<any>("also dummy");
type ActionType =
  | typeof dummyThunk.fulfilled
  | typeof dummyThunk.rejected
  | typeof dummyThunk.pending
  | typeof dummyAction;

/**
 * registerHandler registers a new function to be called any time the specified
 * action has been dispatched. This should be used to emit metrics.
 * @param {ActionType} actionType The action type. This can be a thunk action
 * type or a string.
 * @param {function} handler A callback to run when the actionType has been
 * dispatched.
 * @returns {void}
 */
export function registerHandler<State>(
  actionType: ActionType,
  handler: (state: State, action: AnyAction) => void,
) {
  const type = typeof actionType === "string" ? actionType : actionType.type;
  if (handlersLookup[type]) {
    handlersLookup[type].push(handler);
  } else {
    handlersLookup[type] = [handler];
  }
}

interface event {
  /* eslint-disable camelcase */
  event_type: string;
  event_properties: { [key: string]: any };
  user_id: string;
  device_id: string;
  freighter_account_funded: boolean;
  hw_connected: boolean;
  secret_key_account: boolean;
  secret_key_account_funded: boolean;
  /* eslint-enable camelcase */
}

export interface MetricsData {
  accountType: AccountType;
  hwExists: boolean;
  importedExists: boolean;
  hwFunded: boolean;
  importedFunded: boolean;
  freighterFunded: boolean;
  unfundedFreighterAccounts: Array<string>;
}

const METRICS_ENDPOINT = "https://api.amplitude.com/2/httpapi";
let cache: event[] = [];

const uploadMetrics = throttle(async () => {
  const toUpload = cache;
  cache = [];
  if (!AMPLITUDE_KEY) {
    // eslint-disable-next-line no-console
    console.log("Not uploading metrics", toUpload);
    return;
  }

  const amplitudeFetchRes = await fetch(METRICS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: AMPLITUDE_KEY,
      events: toUpload,
    }),
  });

  if (!amplitudeFetchRes.ok) {
    const amplitudeFetchResJson = await amplitudeFetchRes.json();
    captureException(
      `Error uploading to Amplitude with error: ${JSON.stringify(
        amplitudeFetchResJson,
      )} | cache size: ${toUpload.length} | cache contents: ${JSON.stringify(
        toUpload,
      )}`,
    );
  }
}, 500);

const getUserId = () => {
  const storedId = localStorage.getItem("metrics_user_id");
  if (!storedId) {
    // Create a random ID by taking the decimal portion of a random number
    const newId = Math.random().toString().split(".")[1];
    localStorage.setItem("metrics_user_id", newId);
    return newId;
  }
  return storedId;
};

/**
 *
 * @param {string} name The name (in plain language, thoughtfully considered) of
 * the event. This is long-lived and appears in the metrics dashboard, so
 * logically related events should be presented predictably.
 * @param {object?} body An optional object containing event metadata
 * @returns {void}
 */
export const emitMetric = (name: string, body?: any) => {
  const isDataSharingAllowed = settingsDataSharingSelector(store.getState());
  if (!isDataSharingAllowed) return;

  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}",
  );

  cache.push({
    /* eslint-disable camelcase */
    event_type: name,
    event_properties: body,
    user_id: getUserId(),
    device_id: window.navigator.userAgent,
    freighter_account_funded: metricsData.freighterFunded,
    hw_connected: metricsData.hwExists,
    secret_key_account: metricsData.importedExists,
    secret_key_account_funded: metricsData.importedFunded,
    /* eslint-enable camelcase */
  });
  uploadMetrics();
};
