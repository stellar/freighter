import React from "react";
import { act, renderHook } from "@testing-library/react";
import {
  Account,
  Asset,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";
import { getAssetFromCanonical } from "@shared/helpers/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import * as Blockaid from "popup/helpers/blockaid";

import { useSimulateTxData } from "../useSimulateSwapData";

jest.mock("react-i18next", () => ({
  ...jest.requireActual("react-i18next"),
  useTranslation: () => ({ t: (key: string) => `t:${key}` }),
}));

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

const backendAsset = (a: string) =>
  a === "XLM" ? Asset.native() : (getAssetFromCanonical(a) as Asset);

// /swap/tx as #178's classic source builds it, from the request.
const classicBuild = (req: any) =>
  new TransactionBuilder(new Account(req.account, "1"), {
    fee: "100",
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: backendAsset(req.fromAsset),
        sendAmount: req.amount,
        destination: req.account,
        destAsset: backendAsset(req.toAsset),
        destMin: req.minOut,
        path: req.paths[0].hops
          .slice(1)
          .map((h: { from: string }) => backendAsset(h.from)),
      }),
    )
    .setTimeout(req.timeout)
    .build()
    .toXDR();

const answer = (
  quotesResponse: unknown,
  tx: { status: number; build?: (req: any) => string } = {
    status: 200,
    build: classicBuild,
  },
) =>
  jest.fn(async ({ path, body }: { path: string; body: string }) => {
    if (path.startsWith("/swap/quotes")) {
      return { status: 200, body: { data: quotesResponse } };
    }
    if (tx.status !== 200 || !tx.build) {
      return { status: tx.status, body: { error: "x" } };
    }
    return {
      status: 200,
      body: { data: { xdr: tx.build(JSON.parse(body)), addsTrustline: false } },
    };
  });

const renderSimulate = (
  stored: Record<string, unknown> = {
    // No live quote yet: the hook must fetch one.
    destinationAmount: "",
    path: [],
  },
) =>
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
                ...stored,
              },
            },
          }}
        >
          {children}
        </Wrapper>
      ),
    },
  );

describe("useSimulateTxData error copy", () => {
  let fetchBackendV2: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Blockaid, "useScanTx").mockReturnValue({
      scanTx: jest.fn().mockResolvedValue(null),
    } as any);
    fetchBackendV2 = jest.spyOn(FetchBackendV2, "fetchBackendV2");
  });
  afterEach(() => jest.restoreAllMocks());

  it("translates the error for a build the decoder refuses", async () => {
    fetchBackendV2.mockImplementation(
      answer(quotes, {
        status: 200,
        build: (req) => classicBuild({ ...req, minOut: "0.0000001" }),
      }),
    );
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.error).toBe(
      "t:We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("translates the error for a 400 build", async () => {
    fetchBackendV2.mockImplementation(answer(quotes, { status: 400 }));
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.error).toBe(
      "t:We had an issue retrieving your transaction details. Please try again.",
    );
  });
});
