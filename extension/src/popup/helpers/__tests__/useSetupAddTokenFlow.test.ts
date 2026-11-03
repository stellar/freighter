import { renderHook, act } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { useSetupAddTokenFlow } from "popup/helpers/useSetupAddTokenFlow";

const mockDispatch = jest.fn();
let mockHasPrivateKey = true;

jest.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: any) => selector(),
}));

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn().mockResolvedValue(undefined),
}));

const mockConfirmPassword = jest.fn((password: string) => ({
  type: "confirmPassword",
  payload: password,
})) as jest.Mock & { fulfilled: { match: (action: unknown) => boolean } };
mockConfirmPassword.fulfilled = {
  match: (action: unknown) =>
    (action as { type?: string } | undefined)?.type ===
    "confirmPassword/fulfilled",
};

jest.mock("popup/ducks/accountServices", () => ({
  // A getter defers reading mockConfirmPassword until first use (inside a
  // test), avoiding a TDZ error from the hoisted jest.mock factory running
  // before the module-level `const mockConfirmPassword = ...` below executes.
  get confirmPassword() {
    return mockConfirmPassword;
  },
  hasPrivateKeySelector: () => mockHasPrivateKey,
}));

jest.mock("popup/ducks/settings", () => ({
  settingsNetworkDetailsSelector: () =>
    jest.requireActual("@shared/constants/stellar").TESTNET_NETWORK_DETAILS,
}));

const mockClearHiddenAssetFlag = jest.fn().mockResolvedValue(undefined);
jest.mock("popup/helpers/useHiddenAssets", () => ({
  clearHiddenAssetFlag: (...args: unknown[]) =>
    mockClearHiddenAssetFlag(...args),
}));

const addToken = jest.fn(({ uuid }: { uuid: string }) => ({
  type: "addToken",
  payload: { uuid },
}));
const rejectToken = jest.fn(({ uuid }: { uuid: string }) => ({
  type: "rejectToken",
  payload: { uuid },
}));

const UUID = "test-uuid";

const setup = () =>
  renderHook(() =>
    useSetupAddTokenFlow({ rejectToken, addToken, uuid: UUID } as any),
  );

describe("useSetupAddTokenFlow", () => {
  let closeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // mockReset (not just clear) so a prior test's mockRejectedValue does not
    // leak into the next and surface as an unhandled rejection.
    mockDispatch.mockReset();
    mockDispatch.mockResolvedValue(undefined);
    mockHasPrivateKey = true;
    closeSpy = jest.spyOn(window, "close").mockImplementation(() => undefined);
  });

  afterEach(() => {
    closeSpy.mockRestore();
  });

  it("addTokenAndClose dispatches addToken, emits success metric, and keeps popup open", async () => {
    mockDispatch.mockResolvedValue({ type: "addToken/fulfilled" });
    const { result } = setup();

    let didClose = false;

    await act(async () => {
      didClose = await result.current.addTokenAndClose();
    });

    expect(didClose).toBe(true);
    expect(addToken).toHaveBeenCalledWith({
      uuid: UUID,
      isTrustlineBacked: false,
    });
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.assetAddApiCompleted);
    expect(emitMetric).not.toHaveBeenCalledWith(METRIC_NAMES.assetAddApiFailed);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("addTokenAndClose(true) dispatches addToken with isTrustlineBacked so the background never declines a successful SAC trustline over a storage hiccup", async () => {
    mockDispatch.mockResolvedValue({ type: "addToken/fulfilled" });
    const { result } = setup();

    await act(async () => {
      await result.current.addTokenAndClose(true);
    });

    expect(addToken).toHaveBeenCalledWith({
      uuid: UUID,
      isTrustlineBacked: true,
    });
  });

  it("threads assetCode onto the add/reject dispatch (for asset_add.responded analytics)", async () => {
    mockDispatch.mockResolvedValue({ type: "addToken/fulfilled" });
    const { result } = renderHook(() =>
      useSetupAddTokenFlow({
        rejectToken,
        addToken,
        uuid: UUID,
        assetCode: "USDC",
      } as any),
    );

    await act(async () => {
      await result.current.addTokenAndClose();
    });
    expect(addToken).toHaveBeenCalledWith({
      uuid: UUID,
      isTrustlineBacked: false,
      assetCode: "USDC",
    });

    act(() => {
      result.current.rejectAndClose();
    });
    expect(rejectToken).toHaveBeenCalledWith({ uuid: UUID, assetCode: "USDC" });
  });

  it("addTokenAndClose emits failed metric and keeps the popup open when dispatch rejects", async () => {
    mockDispatch.mockRejectedValue(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = setup();

    let didClose = true;

    await act(async () => {
      didClose = await result.current.addTokenAndClose();
    });

    expect(didClose).toBe(false);
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.assetAddApiFailed, {
      reason_code: "boom",
    });
    expect(emitMetric).not.toHaveBeenCalledWith(
      METRIC_NAMES.assetAddApiCompleted,
    );
    expect(result.current.submitError).toBe(
      "Failed to add token. Please retry or cancel.",
    );
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("addTokenAndClose emits failed metric and keeps popup open when thunk returns rejected action", async () => {
    mockDispatch.mockResolvedValue({
      type: "addToken/rejected",
      error: { message: "user rejected" },
    });
    const { result } = setup();

    let didClose = true;

    await act(async () => {
      didClose = await result.current.addTokenAndClose();
    });

    expect(didClose).toBe(false);
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.assetAddApiFailed, {
      reason_code: "user rejected",
    });
    expect(result.current.submitError).toBe("user rejected");
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("rejectAndClose emits the reject metric, dispatches rejectToken, and closes", () => {
    const { result } = setup();

    act(() => {
      result.current.rejectAndClose();
    });

    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.assetAddApiCancelled);
    expect(rejectToken).toHaveBeenCalledWith({ uuid: UUID });
    expect(closeSpy).toHaveBeenCalled();
  });

  it("handleApprove adds the token directly and closes on success (SEP-41 one-step flow)", async () => {
    mockDispatch.mockResolvedValue({ type: "addToken/fulfilled" });
    const { result } = setup();

    await act(async () => {
      await result.current.handleApprove();
    });

    expect(addToken).toHaveBeenCalledWith({
      uuid: UUID,
      isTrustlineBacked: false,
    });
    expect(result.current.isPasswordRequired).toBe(false);
    expect(closeSpy).toHaveBeenCalled();
  });

  it("handleApprove does NOT close when adding the token fails", async () => {
    mockDispatch.mockResolvedValue({
      type: "addToken/rejected",
      error: { message: "boom" },
    });
    const { result } = setup();

    await act(async () => {
      await result.current.handleApprove();
    });

    expect(result.current.submitError).toBe("boom");
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("verifyPasswordThenAddToken adds the token and closes on success", async () => {
    mockDispatch.mockImplementation((action: any) => {
      if (action?.type === "confirmPassword") {
        return Promise.resolve({ type: "confirmPassword/fulfilled" });
      }
      return Promise.resolve({ type: "addToken/fulfilled" });
    });
    const { result } = setup();

    await act(async () => {
      await result.current.verifyPasswordThenAddToken("pw");
    });

    expect(addToken).toHaveBeenCalledWith({
      uuid: UUID,
      isTrustlineBacked: false,
    });
    expect(closeSpy).toHaveBeenCalled();
  });

  describe("hidden flag cleanup for a SEP-41 add", () => {
    const CONTRACT_ID =
      "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";
    const PUBLIC_KEY =
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

    const setupWithToken = () =>
      renderHook(() =>
        useSetupAddTokenFlow({
          rejectToken,
          addToken,
          uuid: UUID,
          assetCode: "KALE",
          contractId: CONTRACT_ID,
          publicKey: PUBLIC_KEY,
        } as any),
      );

    it("clears the flag before the popup closes after Approve", async () => {
      mockDispatch.mockResolvedValue({ type: "addToken/fulfilled" });
      const { result } = setupWithToken();

      await act(async () => {
        await result.current.handleApprove();
      });

      expect(mockClearHiddenAssetFlag).toHaveBeenCalledWith({
        canonicalAsset: `KALE:${CONTRACT_ID}`,
        activePublicKey: PUBLIC_KEY,
        network: TESTNET_NETWORK_DETAILS.network,
      });
      expect(mockClearHiddenAssetFlag.mock.invocationCallOrder[0]).toBeLessThan(
        closeSpy.mock.invocationCallOrder[0],
      );
    });

    it("clears the flag after a password-confirmed add", async () => {
      mockDispatch.mockImplementation((action: any) => {
        if (action?.type === "confirmPassword") {
          return Promise.resolve({ type: "confirmPassword/fulfilled" });
        }
        return Promise.resolve({ type: "addToken/fulfilled" });
      });
      const { result } = setupWithToken();

      await act(async () => {
        await result.current.verifyPasswordThenAddToken("pw");
      });

      expect(mockClearHiddenAssetFlag).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalled();
    });

    it("leaves the flag alone when the add fails", async () => {
      mockDispatch.mockResolvedValue({
        type: "addToken/rejected",
        error: { message: "boom" },
      });
      const { result } = setupWithToken();

      await act(async () => {
        await result.current.handleApprove();
      });

      expect(mockClearHiddenAssetFlag).not.toHaveBeenCalled();
    });

    it("leaves the flag to the trustline flow for a SAC add", async () => {
      mockDispatch.mockResolvedValue({ type: "addToken/fulfilled" });
      const { result } = setupWithToken();

      await act(async () => {
        await result.current.addTokenAndClose(true);
      });

      expect(mockClearHiddenAssetFlag).not.toHaveBeenCalled();
    });
  });

  it("handleApprove requires a password when no private key is present", async () => {
    mockHasPrivateKey = false;
    const { result } = setup();

    await act(async () => {
      await result.current.handleApprove();
    });

    expect(addToken).not.toHaveBeenCalled();
    expect(result.current.isPasswordRequired).toBe(true);
  });

  it("clearSubmitError resets submit error", async () => {
    mockDispatch.mockResolvedValue({
      type: "addToken/rejected",
      error: { message: "user rejected" },
    });
    const { result } = setup();

    await act(async () => {
      await result.current.addTokenAndClose();
    });

    expect(result.current.submitError).toBe("user rejected");

    act(() => {
      result.current.clearSubmitError();
    });

    expect(result.current.submitError).toBe("");
  });
});
