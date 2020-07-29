import { METRIC_NAMES } from "popup/constants/metricsNames";

import { registerHandler, emitMetric } from "helpers/metrics";

import { createAccount } from "popup/ducks/authServices";
import { AppState } from "popup/App";

registerHandler<AppState>(createAccount.fulfilled, () => {
  emitMetric(METRIC_NAMES.newWallet);
});
