import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import BigNumber from "bignumber.js";
import { AssetType } from "stellar-sdk";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import { RequestState, State } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  initialState,
  saveFederationAddress,
} from "popup/ducks/transactionSubmission";
import { NetworkCongestion } from "popup/helpers/useNetworkFees";
import { SimulateTxData } from "types/transactions";
import { SendAmount } from "..";
import * as sendAmountData from "../hooks/useSendAmountData";

jest.mock("popup/components/InternalTransaction/ReviewTransaction", () => ({
  ReviewTx: () => <div data-testid="review-tx">Review</div>,
}));

const destination = "GBES5UHJYI445RV4XBGWHZOMBW4RYXBHOX47ZNZAJZAH2WP42ZEP2DYQ";
const successState: State<SimulateTxData, string> = {
  state: RequestState.SUCCESS,
  data: { transactionXdr: "reviewed-xdr" },
  error: null,
};
const errorState: State<SimulateTxData, string> = {
  state: RequestState.ERROR,
  data: null,
  error: "Unable to validate Soran destination",
};

const renderSend = (
  federationAddress: string,
  simulationState: State<SimulateTxData, string>,
  ok: boolean,
) => {
  const store = makeDummyStore({
    transactionSubmission: {
      ...initialState,
      transactionData: {
        ...initialState.transactionData,
        asset: "native",
        amount: "5",
        destination,
        federationAddress,
        transactionFee: "0.00001",
      },
    },
  });
  const fetchSimulationData = jest
    .fn()
    .mockResolvedValue(
      ok
        ? { ok: true, data: successState.data }
        : { ok: false, error: errorState.error },
    );
  const component = (state: State<SimulateTxData, string>) => (
    <SendAmount
      goBack={jest.fn()}
      goToNext={jest.fn()}
      goToChooseDest={jest.fn()}
      goToChooseAsset={jest.fn()}
      simulationState={state}
      fetchSimulationData={fetchSimulationData}
      networkCongestion={NetworkCongestion.LOW}
      recommendedFee="0.00001"
    />
  );
  const rendered = render(component(simulationState), {
    wrapper: ({ children }) => (
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    ),
  });
  return {
    store,
    fetchSimulationData,
    rerenderSimulation: (state: State<SimulateTxData, string>) =>
      rendered.rerender(component(state)),
  };
};

const review = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("send-amount-btn-continue"));
  });
};

beforeEach(() => {
  jest.spyOn(sendAmountData, "useGetSendAmountData").mockReturnValue({
    state: {
      state: RequestState.SUCCESS,
      error: null,
      data: {
        type: AppDataType.RESOLVED,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        publicKey: destination,
        networkDetails: TESTNET_NETWORK_DETAILS,
        icons: {},
        userBalances: {
          isFunded: true,
          subentryCount: 0,
          balances: [
            {
              token: { type: AssetType.native, code: "XLM" },
              total: new BigNumber("100"),
              available: new BigNumber("100"),
              buyingLiabilities: "0",
              sellingLiabilities: "0",
              minimumBalance: "1",
              blockaidData: defaultBlockaidScanAssetResult,
            },
          ],
        },
        destinationBalances: { balances: [], isFunded: true, subentryCount: 0 },
        domains: [],
        tokenPrices: {},
      },
    },
    fetchData: jest.fn().mockResolvedValue(undefined),
  });
});
afterEach(() => jest.restoreAllMocks());

it.each([errorState, successState])(
  "does not open Soran review for failed or stale simulation results: $state",
  async (simulationState) => {
    const { fetchSimulationData } = renderSend(
      "alice.nova",
      simulationState,
      false,
    );
    await review();
    expect(fetchSimulationData).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("review-tx")).not.toBeInTheDocument();
  },
);

it("shows Soran simulation errors on the amount screen and allows retry", async () => {
  const { fetchSimulationData, rerenderSimulation } = renderSend(
    "alice.nova",
    errorState,
    false,
  );
  expect(
    screen.getByText("Failed to fetch your transaction details"),
  ).toBeInTheDocument();
  expect(screen.getByText(errorState.error)).toBeInTheDocument();
  expect(screen.getByTestId("send-amount-btn-continue")).not.toBeDisabled();
  await review();
  await review();
  expect(fetchSimulationData).toHaveBeenCalledTimes(2);
  expect(screen.queryByTestId("review-tx")).not.toBeInTheDocument();

  fetchSimulationData.mockResolvedValue({ ok: true, data: successState.data });
  rerenderSimulation(successState);
  await review();
  expect(fetchSimulationData).toHaveBeenCalledTimes(3);
  expect(screen.getByTestId("review-tx")).toBeInTheDocument();
});

it("keeps the existing review error path for unnamed classic payments", async () => {
  renderSend("", errorState, false);
  await review();
  expect(screen.getByTestId("review-tx")).toBeInTheDocument();
});

it("ignores an unnamed classic completion after selecting a Soran name", async () => {
  const { fetchSimulationData, store } = renderSend("", errorState, false);
  let finish!: (result: { ok: false; error: string }) => void;
  fetchSimulationData.mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await review();
  expect(fetchSimulationData).toHaveBeenCalledTimes(1);
  await act(async () => {
    store.dispatch(saveFederationAddress("alice.nova"));
    finish({ ok: false, error: "Simulation inputs changed" });
  });
  expect(screen.queryByTestId("review-tx")).not.toBeInTheDocument();
});

it("opens review for a successful Soran simulation", async () => {
  renderSend("alice.nova", successState, true);
  await review();
  expect(screen.getByTestId("review-tx")).toBeInTheDocument();
});

it.each<State<SimulateTxData, string>>([
  { state: RequestState.IDLE, data: null, error: null },
  { state: RequestState.LOADING, data: null, error: null },
  errorState,
])("closes Soran review when simulation becomes $state", async (nextState) => {
  const { rerenderSimulation } = renderSend("alice.nova", successState, true);
  await review();
  expect(screen.getByTestId("review-tx")).toBeInTheDocument();
  rerenderSimulation(nextState);
  await waitFor(() =>
    expect(screen.queryByTestId("review-tx")).not.toBeInTheDocument(),
  );
});

it("does not close an unnamed classic review when simulation reports an error", async () => {
  const { rerenderSimulation } = renderSend("", successState, true);
  await review();
  rerenderSimulation(errorState);
  expect(screen.getByTestId("review-tx")).toBeInTheDocument();
});

it("closes an unnamed review when selecting Soran invalidates its simulation", async () => {
  const { store, rerenderSimulation } = renderSend("", successState, true);
  await review();
  expect(screen.getByTestId("review-tx")).toBeInTheDocument();
  await act(async () => {
    store.dispatch(saveFederationAddress("alice.nova"));
    rerenderSimulation({ state: RequestState.IDLE, data: null, error: null });
  });
  expect(screen.queryByTestId("review-tx")).not.toBeInTheDocument();
});
