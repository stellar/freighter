import { renderHook, act } from "@testing-library/react";
import * as ApiInternal from "@shared/api/internal";
import { useGetOnrampToken } from "../hooks/useGetOnrampToken";

jest.mock("webextension-polyfill", () => ({
  tabs: {
    create: jest.fn(),
  },
}));

jest.mock("react-redux", () => ({
  useSelector: () => "",
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

describe("useGetOnrampToken (software key)", () => {
  afterEach(() => jest.restoreAllMocks());
  it("attaches the Authorization header and sends an empty body", async () => {
    jest
      .spyOn(ApiInternal, "signOnrampProof")
      .mockResolvedValue({ authHeader: "Stellar payload.sig" });
    const fetchSpy = jest
      .spyOn(global, "fetch" as any)
      .mockResolvedValue({
        json: async () => ({ data: { token: "t" } }),
      } as any);
    const { result } = renderHook(() => useGetOnrampToken({}));
    await act(async () => {
      await result.current.fetchData();
    });
    const [, options] = fetchSpy.mock.calls[0];
    expect((options as any).headers.Authorization).toEqual(
      "Stellar payload.sig",
    );
    expect((options as any).body).toEqual(JSON.stringify({}));
  });
});
