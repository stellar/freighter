import { Asset, Horizon } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { horizonGetBestPath } from "../horizonGetBestPath";
import { getAssetFromCanonical } from "helpers/stellar";
import { cleanAmount } from "../formatters";

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  const mockStrictSendPaths = jest.fn(
    (
      _sourceAsset: Asset,
      _sourceAmount: string,
      _destination: string | Asset[],
    ) => {
      return {
        call: async () => ({ records: [] }),
      };
    },
  );
  return {
    ...original,
    Horizon: {
      Server: class Server {
        constructor(_networkUrl: string) {}
        strictSendPaths = mockStrictSendPaths;
      },
    },
  };
});

describe("horizonGetBestPath", () => {
  it("should clean path amount before making query", async () => {
    const unclean = "1,0000.57";
    const server = new Horizon.Server(TESTNET_NETWORK_DETAILS.networkUrl);
    const asset1 =
      "USDC:GDUBMXMABE7UOZSGYJ5ONE7UYAEHKK3JOX7HZQGNZ7NYTZPPP4AJ2GQJ";
    const asset2 =
      "BLND:GDUBMXMABE7UOZSGYJ5ONE7UYAEHKK3JOX7HZQGNZ7NYTZPPP4AJ2GQJ";

    await horizonGetBestPath({
      amount: unclean,
      sourceAsset: asset1,
      destAsset: asset2,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    const expected = [
      getAssetFromCanonical(asset1) as Asset,
      cleanAmount(unclean),
      [getAssetFromCanonical(asset2)] as Asset[],
    ];
    expect(server.strictSendPaths).toHaveBeenCalledWith(...expected);
  });
});
