import React from "react";
import { render, screen } from "@testing-library/react";
import { FeesPane } from "../index";
import { RequestState } from "constants/request";
import type { State } from "constants/request";
import type { SimulateTxData } from "types/transactions";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const BASE_FEE = "0.00001";
const INCLUSION_FEE = "0.00001";
const RESOURCE_FEE = "0.0093238";

const idleState: State<SimulateTxData, string> = {
  state: RequestState.IDLE,
  data: null,
  error: null,
};

const loadingState: State<SimulateTxData, string> = {
  state: RequestState.LOADING,
  data: null,
  error: null,
};

const successState: State<SimulateTxData, string> = {
  state: RequestState.SUCCESS,
  data: {
    transactionXdr: "xdr",
    inclusionFee: INCLUSION_FEE,
    resourceFee: RESOURCE_FEE,
  },
  error: null,
};

const errorState: State<SimulateTxData, string> = {
  state: RequestState.ERROR,
  data: null,
  error: "Simulation failed: contract error",
};

const mockOnClose = jest.fn();

describe("FeesPane", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Soroban — IDLE/SUCCESS", () => {
    it("shows all 3 rows", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={successState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByTestId("review-tx-inclusion-fee")).toBeTruthy();
      expect(screen.getByTestId("review-tx-resource-fee")).toBeTruthy();
      expect(screen.getByTestId("review-tx-total-fee")).toBeTruthy();
    });

    it("shows actual fees from simulation data", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={successState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByTestId("review-tx-inclusion-fee")).toHaveTextContent(
        `${INCLUSION_FEE} XLM`,
      );
      expect(screen.getByTestId("review-tx-resource-fee")).toHaveTextContent(
        `${RESOURCE_FEE} XLM`,
      );
      expect(screen.getByTestId("review-tx-total-fee")).toHaveTextContent(
        `${BASE_FEE} XLM`,
      );
    });
  });

  describe("Soroban — LOADING", () => {
    it("shows base fee for inclusion and total while simulation is in progress", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={loadingState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      // Base fee is the lower-bound estimate while simulation runs
      expect(screen.getByTestId("review-tx-inclusion-fee")).toHaveTextContent(
        `${BASE_FEE} XLM`,
      );
      expect(screen.getByTestId("review-tx-total-fee")).toHaveTextContent(
        `${BASE_FEE} XLM`,
      );
    });

    it("shows - for resource fee while simulation is in progress", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={loadingState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByTestId("review-tx-resource-fee")).toHaveTextContent(
        "-",
      );
    });
  });

  describe("Soroban — ERROR", () => {
    it("shows — for all fee rows on simulation error", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={errorState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByTestId("review-tx-inclusion-fee")).toHaveTextContent(
        "—",
      );
      expect(screen.getByTestId("review-tx-resource-fee")).toHaveTextContent(
        "—",
      );
      expect(screen.getByTestId("review-tx-total-fee")).toHaveTextContent("—");
    });

    it("shows error notification with simulation error message", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={errorState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText("Failed to simulate transaction")).toBeTruthy();
      expect(
        screen.getByText("Simulation failed: contract error"),
      ).toBeTruthy();
    });

    it("does not show error notification on success", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={successState}
          isSoroban
          onClose={mockOnClose}
        />,
      );
      expect(screen.queryByText("Failed to simulate transaction")).toBeNull();
    });
  });

  describe("Classic (isSoroban=false)", () => {
    it("does not show inclusion or resource fee rows", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={idleState}
          onClose={mockOnClose}
        />,
      );
      expect(
        screen.queryByTestId("review-tx-inclusion-fee"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("review-tx-resource-fee"),
      ).not.toBeInTheDocument();
    });

    it("shows only total fee row with base fee", () => {
      render(
        <FeesPane
          fee={BASE_FEE}
          simulationState={idleState}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByTestId("review-tx-total-fee")).toHaveTextContent(
        `${BASE_FEE} XLM`,
      );
    });
  });
});
