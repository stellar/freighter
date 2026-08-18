import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { useGetAppData, AppDataType } from "../hooks/useGetAppData";
import { makeDummyStore } from "popup/__testHelpers__";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import * as ApiInternal from "@shared/api/internal";

const renderUseGetAppData = (preloadedAuthState: any) => {
  const store = makeDummyStore({
    auth: {
      allAccounts: [],
      publicKey: preloadedAuthState.publicKey ?? "",
      hasPrivateKey: preloadedAuthState.hasPrivateKey ?? false,
      applicationState:
        preloadedAuthState.applicationState ??
        APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      accountStatus: "IDLE",
    },
    settings: {},
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useGetAppData(), { wrapper: Wrapper });
};

describe("useGetAppData — cache fast path requires hasPrivateKey (Bug A regression)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does NOT short-circuit on cached account when hasPrivateKey is false; re-routes to unlockAccount", async () => {
    const loadAccountSpy = jest
      .spyOn(ApiInternal, "loadAccount")
      .mockResolvedValueOnce({
        publicKey: "GCACHED",
        hasPrivateKey: false,
        allAccounts: [],
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      } as any);
    jest.spyOn(ApiInternal, "loadSettings").mockResolvedValueOnce({} as any);

    const { result } = renderUseGetAppData({
      publicKey: "GCACHED",
      hasPrivateKey: false,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    });

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData(true);
    });

    // Cache had publicKey but no hasPrivateKey — fast path must NOT short-circuit.
    expect(loadAccountSpy).toHaveBeenCalled();
    expect(payload?.type).toBe(AppDataType.REROUTE);
    expect(payload?.routeTarget).toBe(ROUTES.unlockAccount);
  });

  it("does short-circuit on cached account when both publicKey and hasPrivateKey are set", async () => {
    const loadAccountSpy = jest.spyOn(ApiInternal, "loadAccount");

    const { result } = renderUseGetAppData({
      publicKey: "GCACHED",
      hasPrivateKey: true,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    });

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData(true);
    });

    expect(loadAccountSpy).not.toHaveBeenCalled();
    expect(payload?.type).toBe(AppDataType.RESOLVED);
    expect(payload?.account?.publicKey).toBe("GCACHED");
  });
});
