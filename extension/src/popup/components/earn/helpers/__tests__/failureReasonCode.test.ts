import { ErrorMessage } from "@shared/api/types";
import { getFailureReasonCode } from "../failureReasonCode";

const asError = (error: unknown) => error as ErrorMessage | undefined;

describe("getFailureReasonCode", () => {
  it("prefers the operation result code", () => {
    expect(
      getFailureReasonCode(
        asError({
          errorMessage: "Transaction failed",
          response: {
            extras: {
              result_codes: {
                transaction: "tx_failed",
                operations: ["op_underfunded"],
              },
            },
          },
        }),
      ),
    ).toBe("op_underfunded");
  });

  it("falls back to the transaction result code", () => {
    expect(
      getFailureReasonCode(
        asError({
          errorMessage: "Transaction failed",
          response: {
            extras: { result_codes: { transaction: "tx_insufficient_fee" } },
          },
        }),
      ),
    ).toBe("tx_insufficient_fee");
  });

  it("scrubs addresses out of a message with no result codes", () => {
    expect(
      getFailureReasonCode(
        asError({
          errorMessage:
            "Account GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF declined",
        }),
      ),
    ).toBe("Account G*** declined");
  });

  it("reads a string reason out of a response body", () => {
    // The soroban submit thunk rejects with the parsed body in `errorMessage`,
    // so this field is an object at runtime however it is typed.
    expect(
      getFailureReasonCode(asError({ errorMessage: { error: "host_error" } })),
    ).toBe("host_error");
  });

  it("returns unknown rather than throwing on an unrecognised body", () => {
    // The regression: scrubStrKeys called `.replace` on an object and threw,
    // which inside the submit hook's try/catch meant the failure went
    // unreported entirely.
    expect(
      getFailureReasonCode(asError({ errorMessage: { extras: { foo: 1 } } })),
    ).toBe("unknown");
    expect(getFailureReasonCode(undefined)).toBe("unknown");
  });
});
