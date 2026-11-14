import { act, renderHook } from "@testing-library/react";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";

import { useSwapLiveQuote } from "../useSwapLiveQuote";

const ACCOUNT_A = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const ACCOUNT_B = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

const baseProps = {
  amount: "5",
  asset: "native",
  destinationAsset: AQUA,
  destinationAmount: "0",
  networkDetails: MAINNET_NETWORK_DETAILS,
  publicKey: ACCOUNT_A,
  isReviewingTx: false,
  swapAmountData: {
    state: RequestState.SUCCESS,
    data: { type: AppDataType.RESOLVED },
  } as any,
  dispatch: jest.fn() as any,
};

describe("useSwapLiveQuote re-quote triggers", () => {
  let fetchBackendV2: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchBackendV2 = jest
      .spyOn(FetchBackendV2, "fetchBackendV2")
      .mockResolvedValue({
        status: 200,
        body: { data: { routes: [], unavailable: [] } },
      });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const settle = () =>
    act(async () => {
      jest.advanceTimersByTime(600);
    });

  it.each([
    ["account", { publicKey: ACCOUNT_B }, "account", ACCOUNT_B],
    [
      "network",
      { networkDetails: TESTNET_NETWORK_DETAILS },
      "path",
      "/swap/quotes?network=TESTNET",
    ],
  ])(
    "re-quotes when the %s changes",
    async (_label, change, field, expected) => {
      const { rerender } = renderHook((props) => useSwapLiveQuote(props), {
        initialProps: baseProps,
      });
      await settle();
      expect(fetchBackendV2).toHaveBeenCalledTimes(1);

      rerender({ ...baseProps, ...change });
      await settle();

      expect(fetchBackendV2).toHaveBeenCalledTimes(2);
      const call = fetchBackendV2.mock.calls[1][0];
      const actual =
        field === "path" ? call.path : JSON.parse(call.body)[field];
      expect(actual).toBe(expected);
    },
  );
});
