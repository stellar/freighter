import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  grantAccess,
  rejectAccess,
  signEntry,
  addToken,
  rejectToken,
  signTransaction,
  signBlob,
  rejectTransaction,
} from "popup/ducks/access";
import { registerHandler, emitMetric, MetricsData } from "helpers/metrics";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AppState } from "popup/App";

// Defer registration to avoid circular dependency issues during module initialization
// Register handlers after a microtask to ensure all modules are fully loaded
Promise.resolve().then(() => {
  registerHandler<AppState>(grantAccess.fulfilled, () => {
    emitMetric(METRIC_NAMES.grantAccessSuccess);
  });

  registerHandler<AppState>(rejectAccess.fulfilled, () => {
    emitMetric(METRIC_NAMES.grantAccessFail);
  });

  registerHandler<AppState>(addToken.fulfilled, () => {
    const metricsData: MetricsData = JSON.parse(
      localStorage.getItem(METRICS_DATA) || "{}",
    );
    emitMetric(METRIC_NAMES.addToken, {
      accountType: metricsData.accountType,
    });
  });

  registerHandler<AppState>(rejectToken.fulfilled, () => {
    emitMetric(METRIC_NAMES.rejectToken);
  });

  registerHandler<AppState>(signTransaction.fulfilled, () => {
    const metricsData: MetricsData = JSON.parse(
      localStorage.getItem(METRICS_DATA) || "{}",
    );
    emitMetric(METRIC_NAMES.signTransaction, {
      accountType: metricsData.accountType,
    });
  });

  registerHandler<AppState>(rejectTransaction.fulfilled, () => {
    emitMetric(METRIC_NAMES.rejectTransaction);
  });

  registerHandler<AppState>(signBlob.fulfilled, () => {
    const metricsData: MetricsData = JSON.parse(
      localStorage.getItem(METRICS_DATA) || "{}",
    );
    emitMetric(METRIC_NAMES.signBlob, {
      accountType: metricsData.accountType,
    });
  });

  registerHandler<AppState>(signEntry.fulfilled, () => {
    const metricsData: MetricsData = JSON.parse(
      localStorage.getItem(METRICS_DATA) || "{}",
    );
    emitMetric(METRIC_NAMES.signAuthEntry, {
      accountType: metricsData.accountType,
    });
  });
});
