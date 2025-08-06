import React, { useRef, useEffect } from "react";
import { render, act } from "@testing-library/react";
import { useNetworkFees, NetworkCongestion } from "../useNetworkFees";
import { BASE_FEE } from "stellar-sdk";

import { useSelector } from "react-redux";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  stellarSdkServer: jest.fn(),
}));

function TestComponent({ callback }) {
  const data = useNetworkFees();

  useEffect(() => {
    callback(data);
  }, [data]);

  return null;
}

describe("useNetworkFees (React 18 compatible)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches and updates fee + congestion manually", async () => {
    useSelector.mockReturnValue({
      networkUrl: "https://testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    const feeStatsMock = jest.fn().mockResolvedValue({
      max_fee: { mode: "300" },
      ledger_capacity_usage: "0.6",
    });

    stellarSdkServer.mockReturnValue({ feeStats: feeStatsMock });

    let hookResult;
    await act(async () => {
      render(
        <TestComponent
          callback={(data) => {
            hookResult = data;
          }}
        />,
      );
    });

    await act(async () => {
      await hookResult.fetchData();
    });

    expect(hookResult.recommendedFee).toBe("0.00003");
    expect(hookResult.networkCongestion).toBe(NetworkCongestion.MEDIUM);

    feeStatsMock.mockResolvedValueOnce({
      max_fee: { mode: "1000" },
      ledger_capacity_usage: "0.9",
    });

    await act(async () => {
      await hookResult.fetchData();
    });

    expect(hookResult.recommendedFee).toBe("0.0001");
    expect(hookResult.networkCongestion).toBe(NetworkCongestion.HIGH);
  });

  it("falls back to BASE_FEE on error", async () => {
    useSelector.mockReturnValue({
      networkUrl: "https://testnet.stellar.org",
      networkPassphrase: "Test SDF Network ; September 2015",
    });

    stellarSdkServer.mockReturnValue({
      feeStats: jest.fn().mockRejectedValue(new Error("Network failure")),
    });

    let hookResult;
    await act(async () => {
      render(
        <TestComponent
          callback={(data) => {
            hookResult = data;
          }}
        />,
      );
    });

    await act(async () => {
      await hookResult.fetchData();
    });

    expect(hookResult.recommendedFee).toBe(BASE_FEE);
    expect(hookResult.networkCongestion).toBe("");
  });
});
