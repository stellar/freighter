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
import {
  emitSigningApproved,
  emitSigningFailed,
  emitSigningRejected,
  originProps,
} from "popup/metrics/signing";
import { AppState } from "popup/App";

// account_type / is_hardware_account now ride on every event via
// buildCommonContext, so the per-handler metricsData reads are gone.

// The dApp origin rides in the thunk arg (`action.meta.arg.url`), threaded from
// the signing/grant views (useSetupSigningFlow / grantAccess). `originProps`
// turns it into the `origin` property (bare hostname, never a full URL).
const argUrl = (action: { meta?: { arg?: { url?: string } } }) =>
  action.meta?.arg?.url;

registerHandler<AppState>(grantAccess.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.dappAccessGranted, originProps(argUrl(action)));
});
registerHandler<AppState>(rejectAccess.fulfilled, (_state, action) => {
  emitMetric(METRIC_NAMES.dappAccessRejected, originProps(argUrl(action)));
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
// Software-key signing outcomes. Hardware keys never reach these thunks (see
// popup/metrics/signing and the HardwareSign overlay); both key types emit
// through the same helpers so the two paths cannot drift apart.
registerHandler<AppState>(signTransaction.fulfilled, (_state, action) => {
  emitSigningApproved("transaction", argUrl(action));
});
registerHandler<AppState>(rejectTransaction.fulfilled, (_state, action) => {
  emitSigningRejected("transaction", argUrl(action));
});
registerHandler<AppState>(signBlob.fulfilled, (_state, action) => {
  emitSigningApproved("message", argUrl(action));
});
registerHandler<AppState>(rejectBlob.fulfilled, (_state, action) => {
  emitSigningRejected("message", argUrl(action));
});
registerHandler<AppState>(signEntry.fulfilled, (_state, action) => {
  emitSigningApproved("authEntry", argUrl(action));
});
registerHandler<AppState>(rejectAuthEntry.fulfilled, (_state, action) => {
  emitSigningRejected("authEntry", argUrl(action));
});

// Runtime signing FAILURE paths — distinct from the user-cancel
// (`reject*.fulfilled`) events above. The sign thunks don't catch, so a runtime
// error surfaces as `.rejected` with the message on `action.error`.
// emitSigningFailed scrubs it and applies the "unknown" fallback.
const rejectedError = (action: {
  error?: { message?: string };
  payload?: { errorMessage?: string };
}): string | undefined => action.error?.message || action.payload?.errorMessage;

registerHandler<AppState>(signBlob.rejected, (_state, action) => {
  emitSigningFailed("message", rejectedError(action), argUrl(action));
});
registerHandler<AppState>(signEntry.rejected, (_state, action) => {
  emitSigningFailed("authEntry", rejectedError(action), argUrl(action));
});
