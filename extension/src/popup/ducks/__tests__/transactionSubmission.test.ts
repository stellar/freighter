import { configureStore } from "@reduxjs/toolkit";

import { SecurityLevel } from "popup/constants/blockaid";
import {
  reducer as transactionSubmissionReducer,
  saveDestinationTokenDetails,
  destinationTokenDetailsSelector,
  clearSwapQuoteExpired,
  resetSubmitStatus,
  resetSubmission,
  submitFreighterTransaction,
  initialState,
  DestinationTokenDetails,
} from "../transactionSubmission";

const makeStore = () =>
  configureStore({
    reducer: { transactionSubmission: transactionSubmissionReducer },
  });

const rejectedWith = (operations: string[]) => ({
  type: submitFreighterTransaction.rejected.type,
  payload: { response: { extras: { result_codes: { operations } } } },
});

const quoteExpiredFlag = (store: ReturnType<typeof makeStore>) =>
  store.getState().transactionSubmission.isSwapQuoteExpired;

describe("transactionSubmission destinationTokenDetails", () => {
  it("defaults destinationTokenDetails to null", () => {
    const store = makeStore();
    expect(destinationTokenDetailsSelector(store.getState())).toBeNull();
  });

  it("saves a non-held (requiresTrustline) destination token", () => {
    const store = makeStore();
    const details: DestinationTokenDetails = {
      tokenCode: "AQUA",
      requiresTrustline: true,
      decimals: 7,
      issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AB3M",
      securityLevel: SecurityLevel.SAFE,
      iconUrl: "https://example.test/aqua.png",
    };

    store.dispatch(saveDestinationTokenDetails(details));

    expect(destinationTokenDetailsSelector(store.getState())).toEqual(details);
  });

  it("saves a held destination token with requiresTrustline false and no issuer (native)", () => {
    const store = makeStore();
    const details: DestinationTokenDetails = {
      tokenCode: "XLM",
      requiresTrustline: false,
      decimals: 7,
    };

    store.dispatch(saveDestinationTokenDetails(details));

    expect(destinationTokenDetailsSelector(store.getState())).toEqual(details);
  });

  it("clears destinationTokenDetails back to null", () => {
    const store = makeStore();
    store.dispatch(
      saveDestinationTokenDetails({
        tokenCode: "AQUA",
        requiresTrustline: true,
        decimals: 7,
        issuer: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AB3M",
      }),
    );

    store.dispatch(saveDestinationTokenDetails(null));

    expect(destinationTokenDetailsSelector(store.getState())).toBeNull();
  });

  it("starts with destinationTokenDetails null in initialState", () => {
    expect(initialState.transactionData.destinationTokenDetails).toBeNull();
  });
});

describe("transactionSubmission slippage default", () => {
  it('defaults allowedSlippage to "2" (matching mobile)', () => {
    expect(initialState.transactionData.allowedSlippage).toBe("2");
  });
});

describe("transactionSubmission isSwapQuoteExpired", () => {
  it("defaults to false", () => {
    expect(initialState.isSwapQuoteExpired).toBe(false);
  });

  it("flags a quote-expiry op code on submit rejection", () => {
    const store = makeStore();
    store.dispatch(rejectedWith(["op_under_dest_min"]));
    expect(quoteExpiredFlag(store)).toBe(true);
  });

  it("does not flag a generic submit failure", () => {
    const store = makeStore();
    store.dispatch(rejectedWith(["op_underfunded"]));
    expect(quoteExpiredFlag(store)).toBe(false);
  });

  it("clearSwapQuoteExpired resets the flag", () => {
    const store = makeStore();
    store.dispatch(rejectedWith(["op_too_few_offers"]));
    expect(quoteExpiredFlag(store)).toBe(true);
    store.dispatch(clearSwapQuoteExpired());
    expect(quoteExpiredFlag(store)).toBe(false);
  });

  it("resetSubmitStatus keeps the flag (it drives the review-screen notice)", () => {
    const store = makeStore();
    store.dispatch(rejectedWith(["op_under_dest_min"]));
    store.dispatch(resetSubmitStatus());
    expect(quoteExpiredFlag(store)).toBe(true);
  });

  it("resetSubmission clears the flag", () => {
    const store = makeStore();
    store.dispatch(rejectedWith(["op_under_dest_min"]));
    store.dispatch(resetSubmission());
    expect(quoteExpiredFlag(store)).toBe(false);
  });
});
