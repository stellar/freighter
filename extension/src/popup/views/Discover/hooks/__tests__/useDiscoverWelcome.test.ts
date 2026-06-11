import { renderHook, waitFor, act } from "@testing-library/react";
import * as ApiInternal from "@shared/api/internal";

import { useDiscoverWelcome } from "../useDiscoverWelcome";

describe("useDiscoverWelcome", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows the welcome modal when the user has never seen it", async () => {
    jest
      .spyOn(ApiInternal, "getHasSeenDiscoverWelcome")
      .mockResolvedValue(false);

    const { result } = renderHook(() => useDiscoverWelcome());

    await waitFor(() => expect(result.current.showWelcome).toBe(true));
  });

  it("stays hidden when the flag is already set", async () => {
    jest
      .spyOn(ApiInternal, "getHasSeenDiscoverWelcome")
      .mockResolvedValue(true);

    const { result } = renderHook(() => useDiscoverWelcome());

    await waitFor(() =>
      expect(ApiInternal.getHasSeenDiscoverWelcome).toHaveBeenCalled(),
    );
    expect(result.current.showWelcome).toBe(false);
  });

  it("keeps the modal hidden when the flag lookup rejects", async () => {
    jest
      .spyOn(ApiInternal, "getHasSeenDiscoverWelcome")
      .mockRejectedValue(new Error("messaging failure"));

    const { result } = renderHook(() => useDiscoverWelcome());

    await waitFor(() =>
      expect(ApiInternal.getHasSeenDiscoverWelcome).toHaveBeenCalled(),
    );
    expect(result.current.showWelcome).toBe(false);
  });

  it("dismisses optimistically and persists the flag", async () => {
    jest
      .spyOn(ApiInternal, "getHasSeenDiscoverWelcome")
      .mockResolvedValue(false);
    const dismissSpy = jest
      .spyOn(ApiInternal, "dismissDiscoverWelcome")
      .mockResolvedValue(true);

    const { result } = renderHook(() => useDiscoverWelcome());
    await waitFor(() => expect(result.current.showWelcome).toBe(true));

    await act(async () => {
      await result.current.dismissWelcome();
    });

    expect(result.current.showWelcome).toBe(false);
    expect(dismissSpy).toHaveBeenCalledTimes(1);
  });

  it("still hides the modal locally if the persistence call rejects", async () => {
    jest
      .spyOn(ApiInternal, "getHasSeenDiscoverWelcome")
      .mockResolvedValue(false);
    jest
      .spyOn(ApiInternal, "dismissDiscoverWelcome")
      .mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useDiscoverWelcome());
    await waitFor(() => expect(result.current.showWelcome).toBe(true));

    await act(async () => {
      await result.current.dismissWelcome();
    });

    expect(result.current.showWelcome).toBe(false);
  });
});
