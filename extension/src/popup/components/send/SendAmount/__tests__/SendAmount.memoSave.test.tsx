import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import { SendAmount } from "popup/components/send/SendAmount";
import * as UseGetSendAmountData from "popup/components/send/SendAmount/hooks/useSendAmountData";

// Collectible/token sends with a destination probe the contract for muxed
// support on mount; keep that off the network.
jest.mock("helpers/muxedAddress", () => ({
  ...jest.requireActual("helpers/muxedAddress"),
  checkIsMuxedSupported: jest.fn().mockResolvedValue(true),
}));

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

const renderSend = (
  amount: string,
  overrides: Record<string, unknown> = {},
) => {
  const fetchSimulationData = jest.fn().mockResolvedValue({ ok: true });
  render(
    <Wrapper
      state={
        {
          transactionSubmission: {
            transactionData: {
              asset: "native",
              amount,
              amountUsd: "0.00",
              destination:
                "GCQRIRNBBXZ6PCX7EGX5NDZBHS6X22TSHR5ANU77LBLQHAPPQS4X7GIG",
              destinationAsset: "",
              federationAddress: "",
              recipientName: "",
              isToken: false,
              isCollectible: false,
              collectibleData: { collectionAddress: "" },
              manualTransactionFee: null,
              transactionFee: "",
              transactionTimeout: 180,
              allowedSlippage: "2",
              memo: "",
              path: [],
              ...overrides,
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
        fetchSimulationData={fetchSimulationData}
        networkCongestion={"LOW" as any}
        recommendedFee="0.00001"
      />
    </Wrapper>,
  );
  return { fetchSimulationData };
};

const saveMemo = async () => {
  fireEvent.click(screen.getByTestId("send-amount-btn-memo"));
  const input = await screen.findByTestId("edit-memo-input");
  fireEvent.change(input, { target: { value: "hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
};

const saveFee = async () => {
  fireEvent.click(screen.getByTestId("send-amount-btn-fee"));
  const input = await screen.findByTestId("edit-tx-settings-fee-input");
  fireEvent.change(input, { target: { value: "0.001" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
};

describe("SendAmount memo save", () => {
  beforeEach(() => {
    jest.spyOn(UseGetSendAmountData, "useGetSendAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: sendData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("does not rebuild the transaction when no amount has been entered yet", async () => {
    const { fetchSimulationData } = renderSend("0");

    await saveMemo();

    await waitFor(() =>
      expect(screen.queryByTestId("edit-memo-input")).not.toBeInTheDocument(),
    );
    expect(fetchSimulationData).not.toHaveBeenCalled();
  });

  it("rebuilds the transaction with the new memo once an amount is set", async () => {
    const { fetchSimulationData } = renderSend("5");

    await saveMemo();

    await waitFor(() => expect(fetchSimulationData).toHaveBeenCalledTimes(1));
  });

  it("does not rebuild the transaction while the amount is above the send maximum", async () => {
    // 12 integer digits is the most the input accepts, and it exceeds
    // TX_SEND_MAX; Continue is blocked on it, and stellar-base rejects it too.
    const { fetchSimulationData } = renderSend("999999999999");

    await saveMemo();

    await waitFor(() =>
      expect(screen.queryByTestId("edit-memo-input")).not.toBeInTheDocument(),
    );
    expect(fetchSimulationData).not.toHaveBeenCalled();
  });
});

describe("SendAmount fee settings save", () => {
  beforeEach(() => {
    jest.spyOn(UseGetSendAmountData, "useGetSendAmountData").mockReturnValue({
      state: { state: RequestState.SUCCESS, data: sendData, error: null },
      fetchData: jest.fn().mockResolvedValue(undefined),
    } as any);
  });
  afterEach(() => jest.restoreAllMocks());

  it("does not rebuild the transaction when no amount has been entered yet", async () => {
    const { fetchSimulationData } = renderSend("0");

    await saveFee();

    await waitFor(() =>
      expect(
        screen.queryByTestId("edit-tx-settings-fee-input"),
      ).not.toBeInTheDocument(),
    );
    expect(fetchSimulationData).not.toHaveBeenCalled();
  });

  it("rebuilds the transaction with the new fee once an amount is set", async () => {
    const { fetchSimulationData } = renderSend("5");

    await saveFee();

    await waitFor(() => expect(fetchSimulationData).toHaveBeenCalledTimes(1));
  });

  it("still rebuilds a collectible send, whose amount is always 0", async () => {
    const { fetchSimulationData } = renderSend("0", {
      isCollectible: true,
      collectibleData: {
        collectionName: "Test Collection",
        collectionAddress:
          "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE",
        tokenId: 1,
        name: "Test #1",
        image: "",
      },
    });

    // Collectible sends also simulate on mount and when the fee sheet opens
    // without a prior result, so count only what Save adds.
    fireEvent.click(screen.getByTestId("send-amount-btn-fee"));
    const input = await screen.findByTestId("edit-tx-settings-fee-input");
    const callsBeforeSave = fetchSimulationData.mock.calls.length;
    fireEvent.change(input, { target: { value: "0.001" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(fetchSimulationData).toHaveBeenCalledTimes(callsBeforeSave + 1),
    );
  });
});
