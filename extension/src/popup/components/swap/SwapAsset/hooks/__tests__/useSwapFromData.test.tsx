import { act, renderHook } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AppDataType } from "helpers/hooks/useGetAppData";

import { useGetSwapFromData } from "../useSwapFromData";

const MOCK_USDC_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const mockUsdc = {
  token: {
    type: "credit_alphanum4",
    code: "USDC",
    issuer: { key: MOCK_USDC_ISSUER },
  },
};
const mockAqua = {
  token: {
    type: "credit_alphanum4",
    code: "AQUA",
    issuer: { key: "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA" },
  },
};

jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({
    fetchData: jest.fn().mockResolvedValue({
      type: "resolved",
      account: {
        publicKey: "G1",
        applicationState: "MNEMONIC_PHRASE_CONFIRMED",
      },
      settings: {
        networkDetails: jest.requireActual("@shared/constants/stellar")
          .TESTNET_NETWORK_DETAILS,
      },
    }),
  }),
}));
jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({
    fetchData: jest
      .fn()
      .mockResolvedValue({ balances: [mockUsdc, mockAqua], icons: {} }),
  }),
}));
jest.mock("helpers/hooks/useGetTokenPrices", () => ({
  useGetTokenPrices: () => ({
    fetchData: jest.fn().mockResolvedValue({ tokenPrices: {} }),
  }),
}));

describe("useGetSwapFromData.fetchData", () => {
  it("lists every balance without a search term", async () => {
    const { result } = renderHook(() =>
      useGetSwapFromData({ showHidden: false, includeIcons: true }),
    );
    await act(async () => {
      await result.current.fetchData(true);
    });
    const data = result.current.state.data as any;
    expect(data.type).toBe(AppDataType.RESOLVED);
    expect(data.filteredBalances).toEqual([mockUsdc, mockAqua]);
    expect(data.networkDetails).toEqual(TESTNET_NETWORK_DETAILS);
  });

  it("keeps the search filter it is given, so a reload doesn't undo the search", async () => {
    const { result } = renderHook(() =>
      useGetSwapFromData({ showHidden: false, includeIcons: true }),
    );
    await act(async () => {
      await result.current.fetchData(true, "AQ");
    });
    expect((result.current.state.data as any).filteredBalances).toEqual([
      mockAqua,
    ]);
  });
});
