import { getSwapErrorMessage, ERROR_TO_DISPLAY } from "../useSimulateSwapData";

const CONTRACT_ID = "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7";
const CLASSIC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const classicAsset = { issuer: CLASSIC_ISSUER };
const contractAsset = { issuer: CONTRACT_ID };

describe("getSwapErrorMessage", () => {
  it("returns custom token error when source is a contract ID", () => {
    const result = getSwapErrorMessage(
      new Error("some error"),
      contractAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.CUSTOM_TOKEN_NOT_SUPPORTED);
  });

  it("returns custom token error when dest is a contract ID", () => {
    const result = getSwapErrorMessage(
      new Error("some error"),
      classicAsset,
      contractAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.CUSTOM_TOKEN_NOT_SUPPORTED);
  });

  it("returns custom token error when both are contract IDs", () => {
    const result = getSwapErrorMessage(
      new Error("some error"),
      contractAsset,
      contractAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.CUSTOM_TOKEN_NOT_SUPPORTED);
  });

  it("returns known error even when assets are contract IDs", () => {
    const result = getSwapErrorMessage(
      new Error(ERROR_TO_DISPLAY.NO_PATH_FOUND),
      contractAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.NO_PATH_FOUND);
  });

  it("returns known error message for classic assets", () => {
    const result = getSwapErrorMessage(
      new Error(ERROR_TO_DISPLAY.NO_PATH_FOUND),
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.NO_PATH_FOUND);
  });

  it("returns unknown error for unrecognized Error with classic assets", () => {
    const result = getSwapErrorMessage(
      new Error("something unexpected"),
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("returns known error message for string errors with classic assets", () => {
    const result = getSwapErrorMessage(
      ERROR_TO_DISPLAY.NO_PATH_FOUND,
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.NO_PATH_FOUND);
  });

  it("returns unknown error for unrecognized string with classic assets", () => {
    const result = getSwapErrorMessage(
      "something unexpected",
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("returns unknown error for non-Error non-string with classic assets", () => {
    const result = getSwapErrorMessage(42, classicAsset, classicAsset);
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });
});
