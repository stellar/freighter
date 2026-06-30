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

jest.mock("popup/ducks/accountServices", () => ({
  confirmPassword: jest.fn((password: string) => ({
    type: "confirmPassword",
    payload: password,
  })),
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

  it("addTokenAndClose dispatches addToken, emits success metric, and closes", async () => {
    mockDispatch.mockResolvedValue(undefined);
    const { result } = setup();

    await act(async () => {
      await result.current.addTokenAndClose();
    });

    expect(addToken).toHaveBeenCalledWith({ uuid: UUID });
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.tokenAddedApi);
    expect(emitMetric).not.toHaveBeenCalledWith(METRIC_NAMES.tokenFailedApi);
    expect(closeSpy).toHaveBeenCalled();
  });

  it("addTokenAndClose emits the failed metric (not success) and still closes when the dispatch rejects", async () => {
    mockDispatch.mockRejectedValue(new Error("boom"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    const { result } = setup();

    await act(async () => {
      await result.current.addTokenAndClose();
    });

    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.tokenFailedApi);
    expect(emitMetric).not.toHaveBeenCalledWith(METRIC_NAMES.tokenAddedApi);
    expect(closeSpy).toHaveBeenCalled();
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

  it("handleApprove adds the token directly when a private key is present", async () => {
    mockDispatch.mockResolvedValue(undefined);
    const { result } = setup();

    await act(async () => {
      await result.current.handleApprove();
    });

    expect(addToken).toHaveBeenCalledWith({ uuid: UUID });
    expect(result.current.isPasswordRequired).toBe(false);
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
});
