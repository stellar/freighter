import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  grantAccess,
  rejectAccess,
  signEntry,
  signTransaction,
  signBlob,
  rejectTransaction,
} from "popup/ducks/access";
import { registerHandler, emitMetric, MetricsData } from "helpers/metrics";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AppState } from "popup/App";

registerHandler<AppState>(grantAccess.fulfilled, () => {
  emitMetric(METRIC_NAMES.grantAccessSuccess);
});
registerHandler<AppState>(rejectAccess.fulfilled, () => {
  emitMetric(METRIC_NAMES.grantAccessFail);
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
