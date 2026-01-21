import React, { useRef, useEffect } from "react";
import { render, act } from "@testing-library/react";
import {
  useNetworkFees,
  NetworkCongestion,
  getNetworkCongestionTranslation,
} from "../useNetworkFees";
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

describe("getNetworkCongestionTranslation", () => {
  let mockT;

  beforeEach(() => {
    // Mock translation function that returns the key as-is
    mockT = jest.fn((key) => key);
  });

  it("returns translated 'Low' for NetworkCongestion.LOW", () => {
    const result = getNetworkCongestionTranslation(mockT, NetworkCongestion.LOW);
    expect(mockT).toHaveBeenCalledWith("Low");
    expect(result).toBe("Low");
  });

  it("returns translated 'Medium' for NetworkCongestion.MEDIUM", () => {
    const result = getNetworkCongestionTranslation(
      mockT,
      NetworkCongestion.MEDIUM,
    );
    expect(mockT).toHaveBeenCalledWith("Medium");
    expect(result).toBe("Medium");
  });

  it("returns translated 'High' for NetworkCongestion.HIGH", () => {
    const result = getNetworkCongestionTranslation(
      mockT,
      NetworkCongestion.HIGH,
    );
    expect(mockT).toHaveBeenCalledWith("High");
    expect(result).toBe("High");
  });

  it("returns the original value as fallback for unknown congestion values", () => {
    const unknownValue = "Unknown";
    // @ts-ignore - Testing runtime fallback behavior with invalid type
    const result = getNetworkCongestionTranslation(mockT, unknownValue);
    expect(result).toBe("Unknown");
  });

  it("uses translations from the t function", () => {
    // Mock t function to return translated values
    const mockTWithTranslations = jest.fn((key) => {
      const translations = {
        Low: "Baixo",
        Medium: "Médio",
        High: "Alto",
      };
      return translations[key] || key;
    });

    const result = getNetworkCongestionTranslation(
      mockTWithTranslations,
      NetworkCongestion.LOW,
    );
    expect(mockTWithTranslations).toHaveBeenCalledWith("Low");
    expect(result).toBe("Baixo");
  });
});

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
