import { renderHook, act } from "@testing-library/react";
import * as ApiInternal from "@shared/api/internal";
import { WalletType } from "@shared/constants/hardwareWallet";
import { useGetOnrampToken } from "../hooks/useGetOnrampToken";

jest.mock("webextension-polyfill", () => ({
  tabs: {
    create: jest.fn(),
  },
}));

jest.mock("react-redux", () => ({
  useSelector: jest.fn(() => ""),
}));

jest.mock("helpers/hooks/useGetAppData", () => ({
  AppDataType: { RESOLVED: "RESOLVED" },
  useGetAppData: () => ({
    fetchData: jest.fn().mockResolvedValue({
      type: "RESOLVED",
      account: { publicKey: "GABC", hardwareWalletType: undefined },
    }),
  }),
}));

jest.mock("popup/helpers/onrampLedger", () => {
  class LedgerOnrampUnsupportedError extends Error {}
  return {
    LedgerOnrampUnsupportedError,
    signOnrampProofWithLedger: jest.fn(),
  };
});

describe("useGetOnrampToken (software key)", () => {
  afterEach(() => jest.restoreAllMocks());
  it("sends the proof in the address_proof body field, no Authorization header", async () => {
    jest
      .spyOn(ApiInternal, "signOnrampProof")
      .mockResolvedValue({ proof: "payload.sig" });
    const fetchSpy = jest.spyOn(global, "fetch" as any).mockResolvedValue({
      json: async () => ({ data: { token: "t" } }),
    } as any);
    const { result } = renderHook(() => useGetOnrampToken({}));
    await act(async () => {
      await result.current.fetchData();
    });
    const [, options] = fetchSpy.mock.calls[0];
    expect((options as any).headers.Authorization).toBeUndefined();
    expect((options as any).body).toEqual(
      JSON.stringify({ address_proof: "payload.sig" }),
    );
  });
});

describe("useGetOnrampToken (Ledger)", () => {
  beforeEach(() => {
    // Make useSelector return WalletType.LEDGER so the hook takes the Ledger path
    const reactRedux = require("react-redux");
    reactRedux.useSelector.mockReturnValue(WalletType.LEDGER);
  });

  afterEach(() => jest.restoreAllMocks());

  it("surfaces LedgerOnrampUnsupportedError message as tokenError", async () => {
    const onrampLedger = require("popup/helpers/onrampLedger");
    onrampLedger.signOnrampProofWithLedger.mockRejectedValue(
      new onrampLedger.LedgerOnrampUnsupportedError(
        "Update your Ledger Stellar app to buy with Coinbase",
      ),
    );

    const { result } = renderHook(() => useGetOnrampToken({}));
    await act(async () => {
      await result.current.fetchData();
    });

    expect(result.current.tokenError).toContain(
      "Update your Ledger Stellar app",
    );
  });
});
