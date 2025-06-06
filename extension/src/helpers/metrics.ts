import throttle from "lodash/throttle";
import { Action, Middleware } from "redux";
import { captureException } from "@sentry/browser";
import { PayloadAction } from "@reduxjs/toolkit";
import { Location } from "react-router-dom";

import { store } from "popup/App";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AMPLITUDE_KEY } from "constants/env";
import { settingsDataSharingSelector } from "popup/ducks/settings";
import { Account, AccountType } from "@shared/api/types";
import { METRIC_NAMES } from "popup/constants/metricsNames";

type MetricsPayloadAction = PayloadAction<{
  errorMessage?: string;
  location?: Location;
}>;
type MetricHandler<AppState> = (
  state: AppState,
  action: MetricsPayloadAction,
) => void;
const handlersLookup: { [key: string]: MetricHandler<any>[] } = {};

/*
 * metricsMiddleware is a redux middleware that calls handlers specified to
 * respond to a specific action type. For each action dispatched, it gets a list
 * of registered handlers and passes the current state and action. These are
 * intended for metrics emission, nothing else.
 */
export function metricsMiddleware<State>(): Middleware<Action, State> {
  return ({ getState }) =>
    (next) =>
    (action: unknown) => {
      const state = getState();
      const _action = action as PayloadAction<{ errorMessage: string }>; // Redux Middleware type forces this unknown for some reason
      (handlersLookup[_action.type] || []).forEach((handler) =>
        handler(state, _action),
      );
      return next(action);
    };
}

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
  actionType: string | { type: string },
  handler: (state: State, action: MetricsPayloadAction) => void,
) {
  const type = typeof actionType === "string" ? actionType : actionType.type;
  if (handlersLookup[type]) {
    handlersLookup[type].push(handler);
  } else {
    handlersLookup[type] = [handler];
  }
}

interface Event {
  event_type: string;
  event_properties: { [key: string]: any };
  user_id: string;
  device_id: string;
  freighter_account_funded: boolean;
  hw_connected: boolean;
  secret_key_account: boolean;
  secret_key_account_funded: boolean;
}

export interface MetricsData {
  accountType: AccountType;
  hwExists: boolean;
  importedExists: boolean;
  hwFunded: boolean;
  importedFunded: boolean;
  freighterFunded: boolean;
  unfundedFreighterAccounts: string[];
}

const METRICS_ENDPOINT = "https://api.amplitude.com/2/httpapi";
let cache: Event[] = [];

const uploadMetrics = throttle(async () => {
  const toUpload = cache;
  cache = [];
  if (!AMPLITUDE_KEY) {
    console.log("Not uploading metrics", toUpload);
    return;
  }

  try {
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
  } catch (e) {
    captureException(
      `Amplitude fetch threw error: ${JSON.stringify(e)} | cache size: ${
        toUpload.length
      } | cache contents: ${JSON.stringify(toUpload)}`,
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
export const emitMetric = async (name: string, body?: any) => {
  const isDataSharingAllowed = settingsDataSharingSelector(store.getState());
  if (!isDataSharingAllowed) {
    return;
  }

  let metricsData: MetricsData;

  try {
    const storedData = localStorage.getItem(METRICS_DATA);
    if (storedData) {
      metricsData = JSON.parse(storedData);
    } else {
      throw new Error("No metrics data found in localStorage");
    }
  } catch {
    // Fallback to default values if parsing fails or data is missing
    metricsData = {
      accountType: AccountType.FREIGHTER,
      hwExists: false,
      importedExists: false,
      hwFunded: false,
      importedFunded: false,
      freighterFunded: false,
      unfundedFreighterAccounts: [],
    };
  }

  cache.push({
    event_type: name,
    event_properties: body,
    user_id: getUserId(),
    device_id: window.navigator.userAgent,
    freighter_account_funded: metricsData.freighterFunded,
    hw_connected: metricsData.hwExists,
    secret_key_account: metricsData.importedExists,
    secret_key_account_funded: metricsData.importedFunded,
  });
  await uploadMetrics();
};

export const storeBalanceMetricData = (
  publicKey: string,
  accountFunded: boolean,
) => {
  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}",
  );
  const accountType = metricsData.accountType;

  if (accountFunded && accountType === AccountType.HW) {
    metricsData.hwFunded = true;
  }
  if (accountFunded && accountType === AccountType.IMPORTED) {
    metricsData.importedFunded = true;
  }
  if (accountType === AccountType.FREIGHTER) {
    // check if we found a previously unfunded freighter account for metrics
    const unfundedFreighterAccounts =
      metricsData.unfundedFreighterAccounts || [];
    const idx = unfundedFreighterAccounts.indexOf(publicKey);

    if (accountFunded) {
      metricsData.freighterFunded = true;
      if (idx !== -1) {
        emitMetric(METRIC_NAMES.freighterAccountFunded, { publicKey });
        unfundedFreighterAccounts.splice(idx, 1);
      }
    }
    if (!accountFunded && idx === -1) {
      unfundedFreighterAccounts.push(publicKey);
    }
    metricsData.unfundedFreighterAccounts = unfundedFreighterAccounts;
  }

  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};

export const storeAccountMetricsData = (
  publicKey: string,
  allAccounts: Account[],
) => {
  const metricsData: MetricsData = JSON.parse(
    localStorage.getItem(METRICS_DATA) || "{}",
  );

  let accountType = AccountType.FREIGHTER;
  allAccounts.forEach((acc: Account) => {
    if (acc.hardwareWalletType) {
      metricsData.hwExists = true;
    } else if (acc.imported) {
      metricsData.importedExists = true;
    }

    if (acc.publicKey === publicKey) {
      if (acc.hardwareWalletType) {
        accountType = AccountType.HW;
      } else if (acc.imported) {
        accountType = AccountType.IMPORTED;
      } else {
        accountType = AccountType.FREIGHTER;
      }
    }
  });
  metricsData.accountType = accountType;
  localStorage.setItem(METRICS_DATA, JSON.stringify(metricsData));
};
