import React from "react";
import { act, renderHook } from "@testing-library/react";
import { Asset, TransactionBuilder } from "stellar-sdk";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import * as Blockaid from "popup/helpers/blockaid";
import * as HorizonGetBestPath from "popup/helpers/horizonGetBestPath";

import { useSimulateTxData } from "../useSimulateSwapData";

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  stellarSdkServer: () => ({
    loadAccount: async (pk: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Account } = require("stellar-sdk");
      return new Account(pk, "1");
    },
  }),
}));

const PUBLIC_KEY = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const AQUA_ISSUER = "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const AQUA = `AQUA:${AQUA_ISSUER}`;

const quotes = {
  routes: [
    {
      source: "classic",
      fromAmount: "10",
      toAmount: "1.5",
      paths: [
        {
          share: "1",
          hops: [
            { venue: "stellar-dex", from: "XLM", to: AQUA },
            { venue: "stellar-dex", from: AQUA, to: USDC },
          ],
        },
      ],
      fees: [],
    },
  ],
  unavailable: [],
};

const renderSimulate = () =>
  renderHook(
    () =>
      useSimulateTxData({
        publicKey: PUBLIC_KEY,
        networkDetails: MAINNET_NETWORK_DETAILS,
        simParams: {
          sourceAsset: Asset.native(),
          destAsset: new Asset("USDC", USDC_ISSUER),
          amount: "10",
          allowedSlippage: "1",
          path: [],
          transactionFee: "0.00001",
          transactionTimeout: 180,
          destRequiresTrustline: false,
        },
      }),
    {
      wrapper: ({ children }) => (
        <Wrapper
          routes={["/"]}
          state={{
            transactionSubmission: {
              ...transactionSubmissionInitialState,
              transactionData: {
                ...transactionSubmissionInitialState.transactionData,
                // No live quote yet: the hook must fetch one.
                destinationAmount: "",
                path: [],
              },
            },
          }}
        >
          {children}
        </Wrapper>
      ),
    },
  );

describe("useSimulateTxData quote when no live quote exists", () => {
  let fetchBackendV2: jest.SpyInstance;
  let horizonGetBestPath: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Blockaid, "useScanTx").mockReturnValue({
      scanTx: jest.fn().mockResolvedValue(null),
    } as any);
    fetchBackendV2 = jest.spyOn(FetchBackendV2, "fetchBackendV2");
    horizonGetBestPath = jest
      .spyOn(HorizonGetBestPath, "horizonGetBestPath")
      .mockRejectedValue(new Error("Horizon must not be called"));
  });
  afterEach(() => jest.restoreAllMocks());

  it("builds the path payment from the backend's classic route", async () => {
    fetchBackendV2.mockResolvedValue({ status: 200, body: { data: quotes } });
    const { result } = renderSimulate();

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData({ amount: "10" });
    });

    expect(fetchBackendV2).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/swap/quotes?network=PUBLIC" }),
    );
    expect(horizonGetBestPath).not.toHaveBeenCalled();

    const tx = TransactionBuilder.fromXDR(
      payload.transactionXdr,
      MAINNET_NETWORK_DETAILS.networkPassphrase,
    ) as any;
    const op = tx.operations[0];
    expect(op.type).toBe("pathPaymentStrictSend");
    expect(op.path.map((a: Asset) => `${a.code}:${a.issuer}`)).toEqual([AQUA]);
    // 1.5 less 1% slippage
    expect(op.destMin).toBe("1.4850000");

    const { transactionData } =
      getTestStore()!.getState().transactionSubmission;
    expect(transactionData.swapQuotes).toEqual(quotes);
  });

  it("reports swaps unavailable when the backend can't quote", async () => {
    fetchBackendV2.mockResolvedValue({ status: 503, body: {} });
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.error).toBe(
      "Swaps are temporarily unavailable",
    );
  });

  it("reports no path when the response has no classic route", async () => {
    fetchBackendV2.mockResolvedValue({
      status: 200,
      body: { data: { routes: [], unavailable: [] } },
    });
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(fetchBackendV2).toHaveBeenCalled();
    expect(result.current.state.error).toBe("No path found for swap.");
  });
});
