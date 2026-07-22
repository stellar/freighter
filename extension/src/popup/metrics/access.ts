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
import { scrubStrKeys } from "helpers/stellarStrKey";
import { getUrlHostname } from "helpers/urls";
import { AppState } from "popup/App";

// account_type / is_hardware_account now ride on every event via
// buildCommonContext, so the per-handler metricsData reads are gone.

// The dApp origin rides in the thunk arg (`action.meta.arg.url`), threaded from
// the signing/grant views (useSetupSigningFlow / grantAccess). Attach it as
// `origin`, normalized to the bare hostname so it matches mobile's
// dappDomain-based `origin` (never a full URL). Omit when no url is present.
const originProps = (action: {
  meta?: { arg?: { url?: string } };
}): { origin?: string } => {
  const url = action.meta?.arg?.url;
  const origin = url ? getUrlHostname(url) : "";
  return origin ? { origin } : {};
};

registerHandler<AppState>(grantAccess.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.dappAccessGranted, originProps(action));
});
registerHandler<AppState>(rejectAccess.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.dappAccessRejected, originProps(action));
});
// asset_code (when the flow knew the token's code) mirrors mobile's
// asset_add.responded { asset_code }; undefined stays off the payload.
const assetCodeProps = (action: {
  meta?: { arg?: { assetCode?: string } };
}): { asset_code?: string } => {
  const assetCode = action.meta?.arg?.assetCode;
  return assetCode ? { asset_code: assetCode } : {};
};

registerHandler<AppState>(addToken.fulfilled, (_state, action) => {
  // These handlers fire only for the dApp injected-API add-token prompt, so the
  // source is fixed. Distinguishes it from mobile's manual add (source:manage_assets).
  emitMetric(METRIC_NAMES.assetAddResponded, {
    decision: "confirm",
    source: "dapp_api",
    ...assetCodeProps(action),
  });
});
registerHandler<AppState>(rejectToken.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.assetAddResponded, {
    decision: "reject",
    source: "dapp_api",
    ...assetCodeProps(action),
  });
});
registerHandler<AppState>(signTransaction.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.signingTransactionApproved, originProps(action));
});
registerHandler<AppState>(rejectTransaction.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.signingTransactionRejected, originProps(action));
});
registerHandler<AppState>(signBlob.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.signingMessageApproved, {
    message_type: "blob",
    ...originProps(action),
  });
});
registerHandler<AppState>(rejectBlob.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.signingMessageRejected, {
    message_type: "blob",
    ...originProps(action),
  });
});
registerHandler<AppState>(signEntry.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.signingAuthEntryApproved, originProps(action));
});
registerHandler<AppState>(rejectAuthEntry.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.signingAuthEntryRejected, originProps(action));
});

// Runtime signing FAILURE paths — distinct from the user-cancel
// (`reject*.fulfilled`) events above. The sign thunks don't catch, so a runtime
// error surfaces as `.rejected` with the message on `action.error`.
const rejectedReasonCode = (action: {
  error?: { message?: string };
  payload?: { errorMessage?: string };
}): string =>
  scrubStrKeys(action.error?.message || action.payload?.errorMessage) ||
  "unknown";

registerHandler<AppState>(signBlob.rejected, (_state, action) => {
  emitMetric(METRIC_NAMES.signingMessageFailed, {
    message_type: "blob",
    reason_code: rejectedReasonCode(action),
    ...originProps(action),
  });
});
registerHandler<AppState>(signEntry.rejected, (_state, action) => {
  emitMetric(METRIC_NAMES.signingAuthEntryFailed, {
    reason_code: rejectedReasonCode(action),
    ...originProps(action),
  });
});
