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
  rejectBlob,
  rejectAuthEntry,
} from "popup/ducks/access";
import { registerHandler, emitMetric } from "helpers/metrics";
import { AppState } from "popup/App";

// account_type / is_hardware_account now ride on every event via
// buildCommonContext, so the per-handler metricsData reads are gone.

registerHandler<AppState>(grantAccess.fulfilled, () => {
  emitMetric(METRIC_NAMES.dappAccessGranted);
});
registerHandler<AppState>(rejectAccess.fulfilled, () => {
  emitMetric(METRIC_NAMES.dappAccessRejected);
});
registerHandler<AppState>(addToken.fulfilled, () => {
  emitMetric(METRIC_NAMES.assetAddResponded, { decision: "confirm" });
});
registerHandler<AppState>(rejectToken.fulfilled, () => {
  emitMetric(METRIC_NAMES.assetAddResponded, { decision: "reject" });
});
registerHandler<AppState>(signTransaction.fulfilled, () => {
  emitMetric(METRIC_NAMES.signingTransactionApproved);
});
registerHandler<AppState>(rejectTransaction.fulfilled, () => {
  emitMetric(METRIC_NAMES.signingTransactionRejected);
});
registerHandler<AppState>(signBlob.fulfilled, () => {
  emitMetric(METRIC_NAMES.signingMessageApproved, { message_type: "blob" });
});
registerHandler<AppState>(rejectBlob.fulfilled, () => {
  emitMetric(METRIC_NAMES.signingMessageRejected, { message_type: "blob" });
});
registerHandler<AppState>(signEntry.fulfilled, () => {
  emitMetric(METRIC_NAMES.signingAuthEntryApproved);
});
registerHandler<AppState>(rejectAuthEntry.fulfilled, () => {
  emitMetric(METRIC_NAMES.signingAuthEntryRejected);
});
