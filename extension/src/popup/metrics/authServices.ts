import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";

import { createAccount, confirmPassword } from "popup/ducks/authServices";
import { AppState } from "popup/App";

registerHandler<AppState>(createAccount.fulfilled, () => {
  emitMetric(METRIC_NAMES.newWallet);
});
registerHandler<AppState>(confirmPassword.fulfilled, () => {
  emitMetric(METRIC_NAMES.confirmPassword);
});
