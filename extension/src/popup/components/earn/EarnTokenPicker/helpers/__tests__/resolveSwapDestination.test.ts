import { Asset } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getTokenDetails } from "@shared/api/internal";

import { resolveSwapDestination } from "../resolveSwapDestination";
import { EarnTokenOption } from "../../hooks/useGetEarnTokensData";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getTokenDetails: jest.fn(),
}));

const { networkPassphrase } = TESTNET_NETWORK_DETAILS;
const EURC_ISSUER = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
// Another account issuing a token under the same code.
const OTHER_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const EURC_SAC = new Asset("EURC", EURC_ISSUER).contractId(networkPassphrase);
const XLM_SAC = Asset.native().contractId(networkPassphrase);

const eurc: EarnTokenOption = {
  assetId: EURC_SAC,
  code: "EURC",
  issuer: undefined,
  iconUrl: null,
  decimals: 7,
  total: "0",
  hasTrustline: false,
  apy: 0.1059,
  poolId: "CPOOL",
};

const resolve = (option: EarnTokenOption = eurc) =>
  resolveSwapDestination({
    option,
    publicKey: "GPUBLIC",
    networkDetails: TESTNET_NETWORK_DETAILS,
  });

describe("resolveSwapDestination", () => {
  afterEach(() => jest.clearAllMocks());

  it("reads the canonical off the token's SAC when the row has no issuer", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({
      name: `EURC:${EURC_ISSUER}`,
    });

    expect(await resolve()).toEqual(
      expect.objectContaining({ canonical: `EURC:${EURC_ISSUER}` }),
    );
  });

  it("declines a name that resolves to another token", async () => {
    // The swap buys what the pool takes, or nothing.
    (getTokenDetails as jest.Mock).mockResolvedValue({ name: "native" });

    expect(await resolve()).toBeNull();
  });

  it("declines the same code from another issuer", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({
      name: `EURC:${OTHER_ISSUER}`,
    });

    expect(await resolve()).toBeNull();
  });

  it("declines a name that is not an asset's", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({ name: "Euro Coin" });

    expect(await resolve()).toBeNull();
  });

  it("resolves XLM from its SAC", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({ name: "native" });

    expect(await resolve({ ...eurc, assetId: XLM_SAC, code: "XLM" })).toEqual(
      expect.objectContaining({
        canonical: "native",
        details: expect.objectContaining({ requiresTrustline: false }),
      }),
    );
  });

  it("checks a known issuer against the pool's token too", async () => {
    expect(await resolve({ ...eurc, issuer: EURC_ISSUER })).toEqual(
      expect.objectContaining({ canonical: `EURC:${EURC_ISSUER}` }),
    );
    expect(await resolve({ ...eurc, issuer: OTHER_ISSUER })).toBeNull();
    // Known issuers need no lookup.
    expect(getTokenDetails).not.toHaveBeenCalled();
  });

  // A contract issuer is what the catalog gives a token it can't tie to a
  // classic asset, which a SAC reported without its canonical also is.
  it("asks the contract when the row's issuer is a contract", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({
      name: `EURC:${EURC_ISSUER}`,
    });

    expect(await resolve({ ...eurc, issuer: EURC_SAC })).toEqual(
      expect.objectContaining({
        canonical: `EURC:${EURC_ISSUER}`,
        details: expect.objectContaining({ issuer: EURC_ISSUER }),
      }),
    );
    expect(getTokenDetails).toHaveBeenCalledTimes(1);
  });

  it("declines a contract token, which Swap can't buy", async () => {
    const tokenContract = new Asset("FOO", OTHER_ISSUER).contractId(
      networkPassphrase,
    );
    (getTokenDetails as jest.Mock).mockResolvedValue({ name: "Foo Token" });

    expect(
      await resolve({
        ...eurc,
        assetId: tokenContract,
        code: "FOO",
        issuer: tokenContract,
      }),
    ).toBeNull();
  });

  it("declines when the token has no name", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue(null);

    expect(await resolve()).toBeNull();
  });
});
