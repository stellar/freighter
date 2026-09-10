import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import { scrubStrKeys } from "helpers/stellarStrKey";
import { getUrlHostname } from "helpers/urls";

/**
 * The three signing requests a dApp can make of the extension.
 *
 * Software keys sign inside the `popup/ducks/access` thunks, so their events
 * are emitted by the redux handlers in `popup/metrics/access.ts`. Hardware keys
 * never reach those thunks — `useSetupSigningFlow` diverts them to the
 * HardwareSign overlay — so that component emits its own events. Both paths
 * emit through this module so one signing request produces the same event name
 * and the same property set whichever key type signed it.
 */
export type SigningKind = "transaction" | "message" | "authEntry";

/**
 * The dApp origin, normalized to the bare hostname so it matches mobile's
 * dappDomain-based `origin` (never a full URL). Omitted when no url is present.
 */
export const originProps = (url?: string): { origin?: string } => {
  const origin = url ? getUrlHostname(url) : "";
  return origin ? { origin } : {};
};

/**
 * Payload-identifying properties that every event of a kind carries. Only the
 * message events have one: the extension signs SEP-53 blobs, so `message_type`
 * is the constant "blob" (mobile emits the same constant).
 */
const KIND_PROPS: Record<SigningKind, Record<string, unknown>> = {
  transaction: {},
  message: { message_type: "blob" },
  authEntry: {},
};

const APPROVED_EVENT: Record<SigningKind, string> = {
  transaction: METRIC_NAMES.signingTransactionApproved,
  message: METRIC_NAMES.signingMessageApproved,
  authEntry: METRIC_NAMES.signingAuthEntryApproved,
};

const REJECTED_EVENT: Record<SigningKind, string> = {
  transaction: METRIC_NAMES.signingTransactionRejected,
  message: METRIC_NAMES.signingMessageRejected,
  authEntry: METRIC_NAMES.signingAuthEntryRejected,
};

/**
 * Runtime-failure events, kept distinct from the user-cancel `*_rejected`
 * events above.
 *
 * `transaction` is deliberately `null`. The shared cross-platform catalog has
 * no transaction runtime-failure member — METRIC_NAMES stops at
 * `signingTransactionBlocked`, and `access.ts` registers no
 * `signTransaction.rejected` handler — so a software transaction failure emits
 * nothing today. The hardware path must match that exactly, so it emits
 * nothing too. The key is spelled out rather than omitted to make the gap
 * explicit: adding `signing.transaction_failed` is a catalog change that has to
 * land on both key types at once.
 */
const FAILED_EVENT: Record<SigningKind, string | null> = {
  transaction: null,
  message: METRIC_NAMES.signingMessageFailed,
  authEntry: METRIC_NAMES.signingAuthEntryFailed,
};

/** The user approved the request and signing completed. */
export const emitSigningApproved = (kind: SigningKind, url?: string): void => {
  emitMetric(APPROVED_EVENT[kind], {
    ...KIND_PROPS[kind],
    ...originProps(url),
  });
};

/**
 * The user declined the request — by pressing reject in the popup, or by
 * declining on a hardware device. Both are the same decision, so both land
 * here. A rejection carries no `reason_code`: nothing went wrong.
 */
export const emitSigningRejected = (kind: SigningKind, url?: string): void => {
  emitMetric(REJECTED_EVENT[kind], {
    ...KIND_PROPS[kind],
    ...originProps(url),
  });
};

/**
 * Signing threw for a reason the user did not choose: a locked wallet, a key
 * that does not decrypt, a malformed payload, a missing or wrong hardware
 * device, a transport fault. A user declining is NOT a failure — that is
 * emitSigningRejected.
 *
 * `reason_code` carries the scrubbed message: a signing error can embed a
 * G…/S… key and Amplitude is a third-party sink not covered by Sentry's
 * beforeSend. Falls back to "unknown" so the property is never absent.
 * No-ops for `transaction` (see FAILED_EVENT).
 */
export const emitSigningFailed = (
  kind: SigningKind,
  error?: string,
  url?: string,
): void => {
  const event = FAILED_EVENT[kind];
  if (!event) {
    return;
  }

  emitMetric(event, {
    ...KIND_PROPS[kind],
    reason_code: scrubStrKeys(error) || "unknown",
    ...originProps(url),
  });
};
