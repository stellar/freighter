import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import {
  emitSigningApproved,
  emitSigningFailed,
  emitSigningRejected,
  originProps,
} from "../signing";

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

const mockEmitMetric = emitMetric as jest.MockedFunction<typeof emitMetric>;

const DAPP_URL = "https://example.com/app?foo=bar";

describe("originProps", () => {
  beforeEach(() => jest.clearAllMocks());

  it("reduces a full URL to the bare hostname", () => {
    expect(originProps(DAPP_URL)).toEqual({ origin: "example.com" });
  });

  it("omits origin when there is no url", () => {
    expect(originProps(undefined)).toEqual({});
    expect(originProps("")).toEqual({});
  });

  it("omits origin when the url does not parse", () => {
    expect(originProps("not-a-url")).toEqual({});
  });
});

describe("emitSigningApproved", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits the transaction event with origin only", () => {
    emitSigningApproved("transaction", DAPP_URL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingTransactionApproved,
      { origin: "example.com" },
    );
  });

  it("emits the message event with the blob message_type", () => {
    emitSigningApproved("message", DAPP_URL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingMessageApproved,
      { message_type: "blob", origin: "example.com" },
    );
  });

  it("emits the auth entry event with origin only", () => {
    emitSigningApproved("authEntry", DAPP_URL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingAuthEntryApproved,
      { origin: "example.com" },
    );
  });

  it("omits origin when no url is threaded through", () => {
    emitSigningApproved("transaction");

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingTransactionApproved,
      {},
    );
  });
});

describe("emitSigningRejected", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["transaction", METRIC_NAMES.signingTransactionRejected, {}],
    ["message", METRIC_NAMES.signingMessageRejected, { message_type: "blob" }],
    ["authEntry", METRIC_NAMES.signingAuthEntryRejected, {}],
  ] as const)("emits the %s rejection", (kind, name, extraProps) => {
    emitSigningRejected(kind, DAPP_URL);

    // A rejection is a user decision, so it never carries a reason_code.
    expect(mockEmitMetric).toHaveBeenCalledWith(name, {
      ...extraProps,
      origin: "example.com",
    });
  });
});

describe("emitSigningFailed", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits the message failure with a scrubbed reason_code", () => {
    emitSigningFailed("message", "Device error", DAPP_URL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingMessageFailed,
      {
        message_type: "blob",
        reason_code: "Device error",
        origin: "example.com",
      },
    );
  });

  it("emits the auth entry failure with a scrubbed reason_code", () => {
    emitSigningFailed("authEntry", "Device error", DAPP_URL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingAuthEntryFailed,
      { reason_code: "Device error", origin: "example.com" },
    );
  });

  it("scrubs Stellar StrKeys out of the reason_code", () => {
    // Amplitude is a third-party sink not covered by Sentry's beforeSend, and a
    // hardware signing error can echo the account it tried to sign as.
    emitSigningFailed(
      "message",
      "cannot sign as GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
    );

    const [, props] = mockEmitMetric.mock.calls[0];
    expect(props!.reason_code).toBe("cannot sign as G***");
  });

  it("falls back to unknown when there is no message", () => {
    emitSigningFailed("message", undefined, DAPP_URL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingMessageFailed,
      {
        message_type: "blob",
        reason_code: "unknown",
        origin: "example.com",
      },
    );
  });

  it("emits nothing for a transaction failure", () => {
    // The shared catalog has no transaction runtime-failure event, so the
    // software path emits nothing here. The hardware path must match it.
    emitSigningFailed("transaction", "Device error", DAPP_URL);

    expect(mockEmitMetric).not.toHaveBeenCalled();
  });
});
