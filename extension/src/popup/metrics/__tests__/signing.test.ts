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
const DAPP = { source: "dapp_api" as const, url: DAPP_URL };
const INTERNAL = { source: "internal" as const };

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

  it.each([
    ["transaction", METRIC_NAMES.signingTransactionApproved, {}],
    ["message", METRIC_NAMES.signingMessageApproved, { message_type: "blob" }],
    ["authEntry", METRIC_NAMES.signingAuthEntryApproved, {}],
  ] as const)(
    "emits the %s approval for a dApp request",
    (kind, name, extra) => {
      emitSigningApproved(kind, DAPP);

      expect(mockEmitMetric).toHaveBeenCalledWith(name, {
        ...extra,
        source: "dapp_api",
        origin: "example.com",
      });
    },
  );

  it("emits an internal approval with no origin", () => {
    // An internal transaction has no dApp, so `origin` stays off the payload
    // and `source` is what separates it from a website request.
    emitSigningApproved("transaction", INTERNAL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingTransactionApproved,
      { source: "internal" },
    );
  });
});

describe("emitSigningRejected", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["transaction", METRIC_NAMES.signingTransactionRejected, {}],
    ["message", METRIC_NAMES.signingMessageRejected, { message_type: "blob" }],
    ["authEntry", METRIC_NAMES.signingAuthEntryRejected, {}],
  ] as const)("emits the %s rejection", (kind, name, extra) => {
    emitSigningRejected(kind, DAPP);

    // A rejection is a user decision, so it never carries a reason_code.
    expect(mockEmitMetric).toHaveBeenCalledWith(name, {
      ...extra,
      source: "dapp_api",
      origin: "example.com",
    });
  });

  it("emits an internal rejection with no origin", () => {
    emitSigningRejected("transaction", INTERNAL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingTransactionRejected,
      { source: "internal" },
    );
  });
});

describe("emitSigningFailed", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ["transaction", METRIC_NAMES.signingTransactionFailed, {}],
    ["message", METRIC_NAMES.signingMessageFailed, { message_type: "blob" }],
    ["authEntry", METRIC_NAMES.signingAuthEntryFailed, {}],
  ] as const)(
    "emits the %s failure with a reason_code",
    (kind, name, extra) => {
      emitSigningFailed(kind, "Device error", DAPP);

      expect(mockEmitMetric).toHaveBeenCalledWith(name, {
        ...extra,
        source: "dapp_api",
        reason_code: "Device error",
        origin: "example.com",
      });
    },
  );

  it("emits an internal failure with no origin", () => {
    emitSigningFailed("transaction", "op_underfunded", INTERNAL);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingTransactionFailed,
      { source: "internal", reason_code: "op_underfunded" },
    );
  });

  it("scrubs Stellar StrKeys out of the reason_code", () => {
    // Amplitude is a third-party sink not covered by Sentry's beforeSend, and
    // a signing error can echo the account it tried to sign as.
    emitSigningFailed(
      "message",
      "cannot sign as GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H",
      DAPP,
    );

    const [, props] = mockEmitMetric.mock.calls[0];
    expect(props!.reason_code).toBe("cannot sign as G***");
  });

  it("falls back to unknown when there is no message", () => {
    emitSigningFailed("message", undefined, DAPP);

    expect(mockEmitMetric).toHaveBeenCalledWith(
      METRIC_NAMES.signingMessageFailed,
      {
        message_type: "blob",
        source: "dapp_api",
        reason_code: "unknown",
        origin: "example.com",
      },
    );
  });
});
