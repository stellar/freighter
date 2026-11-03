import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { useGetAppData, AppDataType } from "../hooks/useGetAppData";
import { makeDummyStore } from "popup/__testHelpers__";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { POPUP_WIDTH } from "constants/dimensions";
import * as ApiInternal from "@shared/api/internal";
import * as IsSidebarModeHelpers from "popup/helpers/isSidebarMode";

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

describe("useGetAppData — shouldOpenTab hands onboarding to a full tab", () => {
  // Wider than the popup, like a side panel the user has dragged out.
  const NON_POPUP_WIDTH = POPUP_WIDTH + 140;
  const originalInnerWidth = window.innerWidth;

  const setInnerWidth = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
  };

  const mockSidebarMode = (isSidebarMode: boolean) =>
    jest
      .spyOn(IsSidebarModeHelpers, "isSidebarMode")
      .mockReturnValue(isSidebarMode);

  // A locked or wallet-less account never has a private key loaded, so the
  // fetch always ends in a re-route.
  const fetchReRoute = async (applicationState: APPLICATION_STATE) => {
    jest.spyOn(ApiInternal, "loadAccount").mockResolvedValueOnce({
      publicKey: "",
      hasPrivateKey: false,
      allAccounts: [],
      applicationState,
    } as any);
    jest.spyOn(ApiInternal, "loadSettings").mockResolvedValueOnce({} as any);

    const { result } = renderUseGetAppData({ applicationState });

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData(true);
    });
    return payload;
  };

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
    jest.restoreAllMocks();
  });

  it("opens a tab for a wallet-less sidebar, whatever its width", async () => {
    setInnerWidth(NON_POPUP_WIDTH);
    mockSidebarMode(true);

    const payload = await fetchReRoute(APPLICATION_STATE.APPLICATION_STARTED);

    expect(payload).toMatchObject({
      type: AppDataType.REROUTE,
      routeTarget: ROUTES.welcome,
      shouldOpenTab: true,
    });
  });

  it("keeps a wallet-less page that is neither the popup nor the sidebar in place", async () => {
    setInnerWidth(NON_POPUP_WIDTH);
    mockSidebarMode(false);

    const payload = await fetchReRoute(APPLICATION_STATE.APPLICATION_STARTED);

    expect(payload).toMatchObject({
      type: AppDataType.REROUTE,
      routeTarget: ROUTES.welcome,
      shouldOpenTab: false,
    });
  });

  it("opens a tab for a wallet-less popup", async () => {
    setInnerWidth(POPUP_WIDTH);
    mockSidebarMode(false);

    const payload = await fetchReRoute(APPLICATION_STATE.APPLICATION_STARTED);

    expect(payload).toMatchObject({
      type: AppDataType.REROUTE,
      routeTarget: ROUTES.welcome,
      shouldOpenTab: true,
    });
  });

  it("keeps a locked sidebar on its lock screen", async () => {
    setInnerWidth(NON_POPUP_WIDTH);
    mockSidebarMode(true);

    const payload = await fetchReRoute(
      APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    );

    expect(payload).toMatchObject({
      type: AppDataType.REROUTE,
      routeTarget: ROUTES.unlockAccount,
      shouldOpenTab: false,
    });
  });
});
