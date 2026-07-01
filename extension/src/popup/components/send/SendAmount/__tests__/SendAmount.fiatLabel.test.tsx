import React from "react";
import { render, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { SendAmount } from "popup/components/send/SendAmount";
import * as UseGetSendAmountData from "popup/components/send/SendAmount/hooks/useSendAmountData";

const nativeBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
};

const sendData = {
  type: AppDataType.RESOLVED,
  applicationState: "MNEMONIC_PHRASE_CONFIRMED",
  publicKey: "G123",
  networkDetails: { network: "PUBLIC" },
  icons: {},
  userBalances: { balances: [nativeBalance] },
  tokenPrices: {},
};

const renderSend = () =>
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            transactionData: {
              asset: "native",
              amount: "5",
              amountUsd: "0.00",
              destination: "",
              destinationAsset: "",
              federationAddress: "",
              recipientName: "",
              isToken: false,
              isCollectible: false,
              collectibleData: { collectionAddress: "" },
              manualTransactionFee: false,
              transactionFee: "",
              transactionTimeout: 180,
              allowedSlippage: "2",
              memo: "",
              path: [],
            },
          },
        } as any
      }
      routes={["/"]}
    >
      <SendAmount
        goBack={jest.fn()}
        goToNext={jest.fn()}
        goToChooseDest={jest.fn()}
        goToChooseAsset={jest.fn()}
        simulationState={
          { state: RequestState.IDLE, data: null, error: null } as any
        }
        fetchSimulationData={jest.fn().mockResolvedValue(undefined)}
        networkCongestion={"LOW" as any}
        recommendedFee="0.00001"
      />
    </Wrapper>,
  );

describe("SendAmount fiat label", () => {
  afterEach(() => jest.restoreAllMocks());

  it("shows '--' for the fiat line when the asset has no price", () => {
    jest.spyOn(UseGetSendAmountData, "useGetSendAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: sendData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);

    renderSend();

    // XLM has no price in tokenPrices -> the fiat line shows "--" (not hidden).
    expect(screen.getByText("--")).toBeInTheDocument();
  });
});
