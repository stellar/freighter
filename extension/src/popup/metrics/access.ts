import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";

import {
  grantAccess,
  rejectAccess,
  signTransaction,
  rejectTransaction,
} from "popup/ducks/access";
import { AppState } from "popup/App";

registerHandler<AppState>(grantAccess.fulfilled, () => {
  emitMetric(METRIC_NAMES.grantAccessSuccess);
});
registerHandler<AppState>(rejectAccess.fulfilled, () => {
  emitMetric(METRIC_NAMES.grantAccessFail);
});
registerHandler<AppState>(signTransaction.fulfilled, () => {
  emitMetric(METRIC_NAMES.signTransaction);
});
registerHandler<AppState>(rejectTransaction.fulfilled, () => {
  emitMetric(METRIC_NAMES.rejectTransaction);
});
