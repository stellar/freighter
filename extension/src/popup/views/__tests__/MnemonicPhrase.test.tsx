import React from "react";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  render,
  waitFor,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";
import { Provider } from "react-redux";

import { reducer as auth } from "popup/ducks/authServices";
import { ROUTES } from "popup/constants/routes";

import { MnemonicPhrase } from "../MnemonicPhrase";
import { METRIC_NAMES } from "popup/constants/metricsNames";
const MNEMONIC = "dummy mnemonic";

const rootReducer = combineReducers({
  auth,
});
const makeDummyStore = (state: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: state,
  });

const { MemoryRouter } = jest.requireActual("react-router-dom");
const Wrapper: React.FunctionComponent<any> = ({ children, state }) => (
  <MemoryRouter>
    <Provider store={makeDummyStore(state)}>{children}</Provider>
  </MemoryRouter>
);

jest.mock("popup/helpers/download");
jest.mock("helpers/metrics");
jest.mock("popup/helpers/useMnemonicPhrase", () => ({
  useMnemonicPhrase: () => "dummy mnemonic",
}));
jest.mock("react-router-dom", () => {
  const ReactRouter = jest.requireActual("react-router-dom");
  return {
    ...ReactRouter,
    Redirect: ({ to }: any) => <div>redirect {to}</div>,
  };
});
jest.mock("@shared/api/internal", () => {
  const { APPLICATION_STATE } = jest.requireActual(
    "@shared/constants/applicationState",
  );
  return {
    confirmMnemonicPhrase: () =>
      Promise.resolve({
        isCorrectPhrase: true,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      }),
  };
});

describe("MnemonicPhrase", () => {
  it("renders", async () => {
    render(
      <Wrapper>
        <MnemonicPhrase />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("display-mnemonic-phrase"));
    expect(screen.getByTestId("display-mnemonic-phrase")).toBeDefined();
  });

  describe("basic flow", () => {
    it("works", async () => {
      render(
        <Wrapper state={{ auth: { error: null, applicationState: "butts" } }}>
          <MnemonicPhrase />
        </Wrapper>,
      );

      const { emitMetric } = jest.requireMock("helpers/metrics");

      // Reveal mnemonic
      fireEvent.click(screen.getByTestId("show"));
      expect(emitMetric).toHaveBeenCalledWith(
        METRIC_NAMES.accountCreatorMnemonicViewPhrase,
      );
      await waitFor(() => screen.getByText(MNEMONIC));

      // Copy
      fireEvent.click(screen.getByTestId("copy"));
      expect(emitMetric).toHaveBeenCalledWith(
        METRIC_NAMES.accountCreatorMnemonicCopyPhrase,
      );
      // Download
      fireEvent.click(screen.getByTestId("download"));
      expect(emitMetric).toHaveBeenCalledWith(
        METRIC_NAMES.accountCreatorMnemonicDownloadPhrase,
      );

      // Confirm mnemonic
      await act(async () => {
        fireEvent.click(screen.getByTestId("confirm"));
        await waitFor(() => screen.getByText(MNEMONIC));
        // Click each word in the mnemonic
        MNEMONIC.split(" ").forEach((word) =>
          fireEvent.click(screen.getByLabelText(word)),
        );
        fireEvent.click(screen.getByTestId("confirm"));
      });
      await waitFor(() =>
        screen.getByText(`redirect ${ROUTES.mnemonicPhraseConfirmed}`),
      );
    });
  });
});
