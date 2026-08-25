import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import BigNumber from "bignumber.js";

import {
  DEFAULT_SWAP_DEST_CANONICAL,
  MAINNET_NETWORK_DETAILS,
  NETWORKS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import { Swap } from "popup/views/Swap";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import * as XlmReserve from "popup/helpers/xlmReserve";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitMetric: jest.fn(),
  // The Swap view emits screen.viewed on mount; the real emitScreenViewed runs
  // buildCommonContext, which reads the Redux auth slice this test's minimal
  // store doesn't provide. These tests cover destination defaulting, not
  // screen-view analytics, so stub the emit.
  emitScreenViewed: jest.fn(),
}));

const MAINNET_USDC = DEFAULT_SWAP_DEST_CANONICAL[NETWORKS.PUBLIC]!;
const TESTNET_USDC = DEFAULT_SWAP_DEST_CANONICAL[NETWORKS.TESTNET]!;

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

const renderSwap = ({
  networkDetails,
  routes = ["/swap"],
}: {
  networkDetails?: {};
  routes?: string[];
}) =>
  render(
    <Wrapper
      state={
        {
          ...(networkDetails ? { settings: { networkDetails } } : {}),
          transactionSubmission: {
            transactionData: {
              asset: "native",
              amount: "0",
              amountUsd: "0.00",
              destinationAmount: "",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              memo: "",
              destination: "",
              path: [],
              destinationAsset: "",
              destinationTokenDetails: null,
              isToken: false,
            },
          },
        } as any
      }
      routes={routes}
    >
      <Swap />
    </Wrapper>,
  );

const getDestinationAsset = () =>
  (getTestStore()!.getState() as any).transactionSubmission.transactionData
    .destinationAsset;

describe("Swap destination default (USDC)", () => {
  beforeEach(() => {
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
    } as any);
    jest.spyOn(UseSimulateSwapData, "useSimulateTxData").mockReturnValue({
      state: {
        state: RequestState.SUCCESS,
        data: { transactionXdr: "AAAA", scanResult: null },
        error: null,
      },
      isQuoteExpired: false,
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest
      .spyOn(XlmReserve, "shouldShowXlmReservePreflight")
      .mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults the destination to the network USDC on testnet", async () => {
    renderSwap({ networkDetails: TESTNET_NETWORK_DETAILS });

    await waitFor(() => {
      expect(getDestinationAsset()).toBe(TESTNET_USDC);
    });
    expect(
      within(screen.getByTestId("swap-receive-card")).getByText("USDC"),
    ).toBeInTheDocument();
  });

  it("defaults the destination to the network USDC on mainnet", async () => {
    renderSwap({ networkDetails: MAINNET_NETWORK_DETAILS });

    await waitFor(() => {
      expect(getDestinationAsset()).toBe(MAINNET_USDC);
    });
  });

  it("defaults the destination to native when the source is already the network USDC", async () => {
    renderSwap({
      networkDetails: TESTNET_NETWORK_DETAILS,
      routes: [`/swap?source_asset=${encodeURIComponent(TESTNET_USDC)}`],
    });

    await waitFor(() => {
      expect(getDestinationAsset()).toBe("native");
    });
    expect(
      within(screen.getByTestId("swap-receive-card")).getByText("XLM"),
    ).toBeInTheDocument();
  });

  it("keeps an explicit destination_asset query param over the default", async () => {
    const explicit =
      "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
    renderSwap({
      networkDetails: TESTNET_NETWORK_DETAILS,
      routes: [`/swap?destination_asset=${encodeURIComponent(explicit)}`],
    });

    await waitFor(() => {
      expect(getDestinationAsset()).toBe(explicit);
    });
  });

  it("applies no default on networks without a configured USDC", async () => {
    renderSwap({});

    // The mount effect resets submission and applies no destination; the
    // receive card stays in its "Select" empty state.
    await waitFor(() => {
      expect(
        within(screen.getByTestId("swap-receive-card")).getByText("Select"),
      ).toBeInTheDocument();
    });
    expect(getDestinationAsset()).toBe("");
  });
});
