import React from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";
import {
  Account,
  Asset,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";
import * as Blockaid from "popup/helpers/blockaid";

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  blockaidData: {},
};

const swapData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  networkDetails: { network: "TESTNET" },
  icons: {},
  userBalances: { balances: [nativeBalance] },
  tokenPrices: {},
};

const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const classicRoute = {
  source: "classic",
  fromAmount: "5",
  toAmount: "42",
  paths: [
    {
      share: "1",
      hops: [
        { venue: "stellar-dex", from: "XLM", to: USDC },
        { venue: "stellar-dex", from: USDC, to: AQUA },
      ],
    },
  ],
  fees: [],
};

const quotesReply = (routes: unknown[]) => ({
  status: 200,
  body: { data: { routes, unavailable: [] } },
});

const renderSwapAmount = (transactionData: Record<string, unknown>) =>
  render(
    <Wrapper
      state={
        {
          settings: { networkDetails: MAINNET_NETWORK_DETAILS },
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
              asset: "native",
              amount: "5",
              amountUsd: "0.00",
              destinationAmount: "0",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset: AQUA,
              destinationTokenDetails: null,
              isToken: false,
              ...transactionData,
            },
          },
        } as any
      }
      routes={["/"]}
    >
      <SwapAmount
        inputType="crypto"
        setInputType={jest.fn()}
        goBack={jest.fn()}
        goToNext={jest.fn()}
        goToEditSrc={jest.fn()}
        goToEditDst={jest.fn()}
      />
    </Wrapper>,
  );


const builtTx = (req: any) =>
  new TransactionBuilder(new Account(req.account, "1"), {
    fee: "100",
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: req.amount,
        destination: req.account,
        destAsset: new Asset("AQUA", AQUA.split(":")[1]),
        destMin: req.minOut,
        path: [],
      }),
    )
    .setTimeout(req.timeout)
    .build()
    .toXDR();

describe("SwapAmount settings saved from review", () => {
  let fetchBackendV2: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(Blockaid, "useScanTx").mockReturnValue({
      scanTx: jest.fn().mockResolvedValue(null),
    } as any);
    fetchBackendV2 = jest
      .spyOn(FetchBackendV2, "fetchBackendV2")
      .mockImplementation(async ({ path, body }: any) =>
        path.startsWith("/swap/quotes")
          ? quotesReply([classicRoute])
          : {
              status: 200,
              body: {
                data: { xdr: builtTx(JSON.parse(body)), addsTrustline: false },
              },
            },
      );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("rebuilds with the fee and timeout just saved", async () => {
    const { container } = renderSwapAmount({
      amount: "5",
      destinationAsset: AQUA,
    });
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    const settingsButton = container.querySelectorAll(
      ".SwapAsset__settings-options button",
    )[1];
    await act(async () => {
      fireEvent.click(settingsButton);
    });
    fireEvent.change(screen.getByTestId("edit-tx-settings-fee-input"), {
      target: { value: "0.0005" },
    });
    fireEvent.change(screen.getByLabelText("Timeout (seconds)"), {
      target: { value: "60" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
    });
    await act(async () => {
      jest.advanceTimersByTime(10);
    });

    const builds = fetchBackendV2.mock.calls.filter(([{ path }]) =>
      path.startsWith("/swap/tx"),
    );
    expect(builds.length).toBeGreaterThan(0);
    expect(JSON.parse(builds[builds.length - 1][0].body)).toMatchObject({
      fee: "0.0005",
      timeout: 60,
    });
  });
});
