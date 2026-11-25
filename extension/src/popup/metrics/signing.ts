import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import { scrubStrKeys } from "helpers/stellarStrKey";
import { getUrlHostname } from "helpers/urls";

/**
 * The three signing requests a dApp can make of the extension.
 *
 * Every signing path emits through this module, so one signing request
 * produces the same event name and the same property set wherever it ran:
 * the dApp thunks in `popup/metrics/access.ts`, the HardwareSign overlay, the
 * internal submission hook, and the trustline flow.
 */
export enum SigningKind {
  Transaction = "transaction",
  Message = "message",
  AuthEntry = "authEntry",
}

/**
 * Where a signing request came from.
 *
 * `dapp_api` is a website asking through the injected API. `internal` is a
 * transaction the wallet composed itself — a send, a swap, a collectible send,
 * or a trustline change. Both origins emit the same events with the same
 * properties, so one query counts all signing and `source` splits it. The
 * token add and remove events already use `dapp_api` this way.
 */
export enum SigningSource {
  DappApi = "dapp_api",
  Internal = "internal",
}

interface SigningEventOptions {
  source: SigningSource;
  /**
   * The requesting dApp's URL. Internal transactions have no origin, so they
   * omit it and the `origin` property stays off the payload.
   */
  url?: string;
}

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
  [SigningKind.Transaction]: {},
  [SigningKind.Message]: { message_type: "blob" },
  [SigningKind.AuthEntry]: {},
};

const APPROVED_EVENT: Record<SigningKind, string> = {
  [SigningKind.Transaction]: METRIC_NAMES.signingTransactionApproved,
  [SigningKind.Message]: METRIC_NAMES.signingMessageApproved,
  [SigningKind.AuthEntry]: METRIC_NAMES.signingAuthEntryApproved,
};

const REJECTED_EVENT: Record<SigningKind, string> = {
  [SigningKind.Transaction]: METRIC_NAMES.signingTransactionRejected,
  [SigningKind.Message]: METRIC_NAMES.signingMessageRejected,
  [SigningKind.AuthEntry]: METRIC_NAMES.signingAuthEntryRejected,
};

/**
 * Runtime-failure events, kept distinct from the user-decline `*_rejected`
 * events above. Every kind has one, so a signing attempt always reports an
 * outcome: approved, rejected, or failed.
 */
const FAILED_EVENT: Record<SigningKind, string> = {
  [SigningKind.Transaction]: METRIC_NAMES.signingTransactionFailed,
  [SigningKind.Message]: METRIC_NAMES.signingMessageFailed,
  [SigningKind.AuthEntry]: METRIC_NAMES.signingAuthEntryFailed,
};

/** The user approved the request and signing produced a signature. */
export const emitSigningApproved = (
  kind: SigningKind,
  { source, url }: SigningEventOptions,
): void => {
  emitMetric(APPROVED_EVENT[kind], {
    ...KIND_PROPS[kind],
    source,
    ...originProps(url),
  });
};

/**
 * The user declined the request — by pressing reject in the popup, or by
 * declining on a hardware device. Both are the same decision, so both land
 * here. A rejection carries no `reason_code`: nothing went wrong.
 */
export const emitSigningRejected = (
  kind: SigningKind,
  { source, url }: SigningEventOptions,
): void => {
  emitMetric(REJECTED_EVENT[kind], {
    ...KIND_PROPS[kind],
    source,
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
 */
export const emitSigningFailed = (
  kind: SigningKind,
  error: string | undefined,
  { source, url }: SigningEventOptions,
): void => {
  emitMetric(FAILED_EVENT[kind], {
    ...KIND_PROPS[kind],
    source,
    reason_code: scrubStrKeys(error) || "unknown",
    ...originProps(url),
  });
};
