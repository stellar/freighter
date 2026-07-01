import { Asset, Horizon } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  horizonGetBestPath,
  horizonGetBestReceivePath,
} from "../horizonGetBestPath";
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
  const mockStrictReceivePaths = jest.fn(
    (_source: Asset[], _destAsset: Asset, _destAmount: string) => ({
      call: async () => ({ records: [] }),
    }),
  );
  return {
    ...original,
    Horizon: {
      Server: class Server {
        constructor(_networkUrl: string) {}
        strictSendPaths = mockStrictSendPaths;
        strictReceivePaths = mockStrictReceivePaths;
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

describe("horizonGetBestReceivePath", () => {
  it("calls strictReceivePaths with the cleaned destination amount", async () => {
    const uncleanDest = "0,5000";
    const server = new Horizon.Server(TESTNET_NETWORK_DETAILS.networkUrl);
    const source =
      "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
    const dest = "native";

    await horizonGetBestReceivePath({
      destinationAmount: uncleanDest,
      sourceAsset: source,
      destAsset: dest,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    const expected = [
      [getAssetFromCanonical(source) as Asset],
      getAssetFromCanonical(dest) as Asset,
      cleanAmount(uncleanDest),
    ];
    expect(server.strictReceivePaths).toHaveBeenCalledWith(...expected);
  });
});
