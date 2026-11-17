import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getTokenDetails } from "@shared/api/internal";

import { resolveSwapDestination } from "../resolveSwapDestination";
import { EarnTokenOption } from "../../hooks/useGetEarnTokensData";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getTokenDetails: jest.fn(),
}));

const EURC_ISSUER = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
const EURC_SAC = "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV";

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

const resolve = () =>
  resolveSwapDestination({
    option: eurc,
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
    // The swap buys what the row shows, or nothing.
    (getTokenDetails as jest.Mock).mockResolvedValue({ name: "native" });

    expect(await resolve()).toBeNull();
  });

  it("declines when the token has no name", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue(null);

    expect(await resolve()).toBeNull();
  });
});
