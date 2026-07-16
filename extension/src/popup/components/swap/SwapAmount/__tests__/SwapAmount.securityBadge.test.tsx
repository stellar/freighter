import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { SecurityLevel } from "popup/constants/blockaid";
import { Wrapper } from "popup/__testHelpers__";
import { SwapAmount } from "popup/components/swap/SwapAmount";
import * as UseGetSwapAmountData from "popup/components/swap/SwapAmount/hooks/useGetSwapAmountData";
import * as UseSimulateSwapData from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
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

const AQUA_ISSUER = "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

const renderWithDestination = (
  securityLevel?: SecurityLevel,
  issuer?: string,
) =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            transactionData: {
              asset: "native",
              amount: "5",
              amountUsd: "0.00",
              destinationAsset: AQUA,
              destinationAmount: "10",
              allowedSlippage: "2",
              transactionFee: "",
              transactionTimeout: 180,
              destinationTokenDetails: {
                tokenCode: "AQUA",
                requiresTrustline: true,
                decimals: 7,
                issuer,
                securityLevel,
              },
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

describe("SwapAmount destination security badge", () => {
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
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
    jest.spyOn(UseGetSwapAmountData, "useGetSwapAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: swapData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows the warning badge on the receive card for a malicious destination", () => {
    renderWithDestination(SecurityLevel.MALICIOUS);
    const receiveCard = screen.getByTestId("swap-receive-card");
    expect(
      within(receiveCard).getByTestId("ScamAssetIcon"),
    ).toBeInTheDocument();
  });

  it("does not show the badge for a safe destination", () => {
    renderWithDestination(SecurityLevel.SAFE);
    const receiveCard = screen.getByTestId("swap-receive-card");
    expect(
      within(receiveCard).queryByTestId("ScamAssetIcon"),
    ).not.toBeInTheDocument();
  });

  it("renders the amount screen even while the network fee is still loading", () => {
    // Regression: the fullscreen spinner must NOT be gated on the (untimed-out)
    // feeStats request — a slow Horizon was hanging the screen >15s.
    // With swap data ready, the form renders regardless of useNetworkFees isLoading.
    jest.spyOn(UseNetworkFees, "useNetworkFees").mockReturnValue({
      networkCongestion: "LOW",
      recommendedFee: "0.00001",
      isLoading: true,
    } as any);
    renderWithDestination(SecurityLevel.SAFE);
    expect(screen.getByTestId("swap-receive-card")).toBeInTheDocument();
  });

  it("recovers a missing destination verdict via scan-on-select and badges it", async () => {
    // Token picked before its scan landed: securityLevel is undefined. The
    // scan-on-select effect resolves the verdict and persists it, so the badge
    // appears.
    jest.spyOn(Blockaid, "isBlockaidEnabled").mockReturnValue(true);
    const scanSpy = jest.spyOn(Blockaid, "scanAssetBulk").mockResolvedValue({
      results: { [`AQUA-${AQUA_ISSUER}`]: { result_type: "Malicious" } },
    } as any);

    renderWithDestination(undefined, AQUA_ISSUER);

    await waitFor(() => {
      const receiveCard = screen.getByTestId("swap-receive-card");
      expect(
        within(receiveCard).getByTestId("ScamAssetIcon"),
      ).toBeInTheDocument();
    });
    expect(scanSpy).toHaveBeenCalledWith(
      [`AQUA-${AQUA_ISSUER}`],
      expect.anything(),
      expect.anything(),
    );
  });
});
