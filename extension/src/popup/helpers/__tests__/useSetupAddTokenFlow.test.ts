import { renderHook, act } from "@testing-library/react";

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
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.tokenAddedApi);
    expect(emitMetric).not.toHaveBeenCalledWith(METRIC_NAMES.tokenFailedApi);
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

  it("addTokenAndClose emits failed metric and keeps the popup open when dispatch rejects", async () => {
    mockDispatch.mockRejectedValue(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = setup();

    let didClose = true;

    await act(async () => {
      didClose = await result.current.addTokenAndClose();
    });

    expect(didClose).toBe(false);
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.tokenFailedApi);
    expect(emitMetric).not.toHaveBeenCalledWith(METRIC_NAMES.tokenAddedApi);
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
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.tokenFailedApi);
    expect(result.current.submitError).toBe("user rejected");
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it("rejectAndClose emits the reject metric, dispatches rejectToken, and closes", () => {
    const { result } = setup();

    act(() => {
      result.current.rejectAndClose();
    });

    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.tokenRejectApi);
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
