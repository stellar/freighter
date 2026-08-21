import get from "lodash/get";

import { ErrorMessage } from "@shared/api/types";
import { scrubStrKeys } from "helpers/stellarStrKey";
import { getResultCodes } from "popup/helpers/parseTransaction";

/**
 * `errorMessage` is typed as a string, but the soroban submit thunk rejects with
 * the parsed response body in that field (`rejectWithValue({ errorMessage:
 * response })`), so at runtime it can be an object — and `scrubStrKeys` would
 * throw on one. Only a string reason is usable as a metric dimension anyway:
 * stringifying a whole body would put unbounded cardinality on the event.
 */
const getErrorText = (error: ErrorMessage | undefined) => {
  const { errorMessage } = error || {};
  if (typeof errorMessage === "string") {
    return errorMessage;
  }
  const nested = get(errorMessage, "error") || get(errorMessage, "message");
  return typeof nested === "string" ? nested : undefined;
};

/**
 * The `reason_code` for a failed deposit: the operation or transaction result
 * code when the attempt reached the network, otherwise the error message — a
 * rejected signature never gets result codes, and "unknown" for every one of
 * those would collapse the failure modes we most want to tell apart. Scrubbed,
 * because an error message can quote an address.
 *
 * Shared, because `earn.deposit_failed` has two emitters: the submit hook owns
 * the failures of its own thunks (its closure outlives the screen, so it still
 * reports after the user closes it), and the Earn view owns everything that
 * fails before the flow reaches that screen.
 */
export const getFailureReasonCode = (error: ErrorMessage | undefined) => {
  const resultCodes = getResultCodes(error);
  return (
    resultCodes.operations?.[0] ||
    resultCodes.transaction ||
    scrubStrKeys(getErrorText(error)) ||
    "unknown"
  );
};
