import { Asset, Networks } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { getContractFnArgNames, isAssetSac } from "popup/helpers/soroban";

const futurenetDetails = {
  network: "FUTURENET",
  networkPassphrase: Networks.FUTURENET,
} as NetworkDetails;

describe("isAssetSac", () => {
  it("recognises the native contract on FUTURENET", () => {
    expect(
      isAssetSac({
        asset: {
          code: "XLM",
          issuer: undefined,
          contract: Asset.native().contractId(Networks.FUTURENET),
        },
        networkDetails: futurenetDetails,
      }),
    ).toBe(true);
  });

  it("does not recognise an unrelated contract as the native one", () => {
    expect(
      isAssetSac({
        asset: {
          code: "XLM",
          issuer: undefined,
          contract: Asset.native().contractId(Networks.PUBLIC),
        },
        networkDetails: futurenetDetails,
      }),
    ).toBe(false);
  });
});

describe("getContractFnArgNames", () => {
  // gauge_schedule_reward(router, distributor, gauge, start_at: Option<u64>,
  // duration, tps) as `Spec.jsonSchema()` emits it: `properties` holds all six
  // parameters in declaration order, `required` omits the Option.
  const gaugeSpec = {
    definitions: {
      gauge_schedule_reward: {
        properties: {
          args: {
            type: "object",
            properties: {
              router: { $ref: "#/definitions/Address" },
              distributor: { $ref: "#/definitions/Address" },
              gauge: { $ref: "#/definitions/Address" },
              start_at: { type: "object" },
              duration: { type: "integer" },
              tps: { $ref: "#/definitions/U128" },
            },
            required: ["router", "distributor", "gauge", "duration", "tps"],
          },
        },
      },
    },
  };

  it("names every argument in declaration order, including an Option", () => {
    expect(
      getContractFnArgNames(gaugeSpec, "gauge_schedule_reward", 6),
    ).toEqual([
      "router",
      "distributor",
      "gauge",
      "start_at",
      "duration",
      "tps",
    ]);
  });

  it("names arguments when every parameter is optional and required is absent", () => {
    const spec = {
      definitions: {
        maybe: {
          properties: {
            args: {
              type: "object",
              properties: {
                first: { type: "object" },
                second: { type: "object" },
              },
            },
          },
        },
      },
    };

    expect(getContractFnArgNames(spec, "maybe", 2)).toEqual([
      "first",
      "second",
    ]);
  });

  it("returns null when the spec names fewer arguments than were passed", () => {
    expect(
      getContractFnArgNames(gaugeSpec, "gauge_schedule_reward", 5),
    ).toBeNull();
  });

  it("returns null when the spec names more arguments than were passed", () => {
    expect(
      getContractFnArgNames(gaugeSpec, "gauge_schedule_reward", 7),
    ).toBeNull();
  });

  it("keeps the key order even when required lists the names differently", () => {
    // `required` is not an order witness -- it is emitted in declaration order
    // but omits every Option, so it can never be reconciled against the keys.
    // The names come from `properties` alone.
    const spec = {
      definitions: {
        transfer: {
          properties: {
            args: {
              type: "object",
              properties: {
                from: { $ref: "#/definitions/Address" },
                to: { $ref: "#/definitions/Address" },
                amount: { $ref: "#/definitions/I128" },
              },
              required: ["amount", "from", "to"],
            },
          },
        },
      },
    };

    expect(getContractFnArgNames(spec, "transfer", 3)).toEqual([
      "from",
      "to",
      "amount",
    ]);
  });

  it("returns null for integer-like parameter names, which Object.keys reorders", () => {
    const spec = {
      definitions: {
        weird: {
          properties: {
            args: {
              type: "object",
              properties: {
                "1": { type: "integer" },
                "0": { type: "integer" },
              },
            },
          },
        },
      },
    };

    expect(getContractFnArgNames(spec, "weird", 2)).toBeNull();
  });

  it("returns null when the function is not in the spec", () => {
    expect(getContractFnArgNames(gaugeSpec, "transfer", 3)).toBeNull();
  });

  it("returns null when the definition carries no args schema", () => {
    const spec = { definitions: { noop: { properties: {} } } };
    expect(getContractFnArgNames(spec, "noop", 1)).toBeNull();
  });

  it("returns null when there is no spec at all", () => {
    expect(getContractFnArgNames(undefined, "transfer", 3)).toBeNull();
  });

  it("returns an empty list for a zero-argument function", () => {
    const spec = {
      definitions: { bump: { properties: { args: { properties: {} } } } },
    };
    expect(getContractFnArgNames(spec, "bump", 0)).toEqual([]);
  });
});
