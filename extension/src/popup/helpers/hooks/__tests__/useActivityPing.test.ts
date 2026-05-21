import { renderHook } from "@testing-library/react";

import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";
import { useActivityPing } from "../useActivityPing";

jest.mock("@shared/api/helpers/extensionMessaging", () => ({
  sendMessageToBackground: jest.fn().mockResolvedValue({}),
}));

const activityEvents = ["mousedown", "keydown", "touchstart", "wheel"];

describe("useActivityPing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
    (sendMessageToBackground as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("sends USER_ACTIVITY on the first event and throttles events within 5 seconds", () => {
    renderHook(() => useActivityPing(true));

    window.dispatchEvent(new MouseEvent("mousedown"));
    window.dispatchEvent(new KeyboardEvent("keydown"));

    expect(sendMessageToBackground).toHaveBeenCalledTimes(1);
    expect(sendMessageToBackground).toHaveBeenCalledWith({
      type: SERVICE_TYPES.USER_ACTIVITY,
      activePublicKey: null,
    });
  });

  it("sends another ping after the 5 second throttle window", () => {
    renderHook(() => useActivityPing(true));

    window.dispatchEvent(new MouseEvent("mousedown"));
    jest.setSystemTime(14_999);
    window.dispatchEvent(new WheelEvent("wheel"));
    jest.setSystemTime(15_000);
    window.dispatchEvent(new WheelEvent("wheel"));

    expect(sendMessageToBackground).toHaveBeenCalledTimes(2);
  });

  it("listens to all configured activity events", () => {
    renderHook(() => useActivityPing(true));

    for (const eventName of activityEvents) {
      (sendMessageToBackground as jest.Mock).mockClear();
      jest.setSystemTime(Date.now() + 5_000);
      window.dispatchEvent(new Event(eventName));
      expect(sendMessageToBackground).toHaveBeenCalledTimes(1);
    }
  });

  it("cleans up listeners on unmount", () => {
    const addSpy = jest.spyOn(window, "addEventListener");
    const removeSpy = jest.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useActivityPing(true));
    unmount();

    for (const eventName of activityEvents) {
      expect(addSpy).toHaveBeenCalledWith(
        eventName,
        expect.any(Function),
        { passive: true },
      );
      expect(removeSpy).toHaveBeenCalledWith(eventName, expect.any(Function));
    }

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("does not register listeners when locked", () => {
    const addSpy = jest.spyOn(window, "addEventListener");

    renderHook(() => useActivityPing(false));
    window.dispatchEvent(new MouseEvent("mousedown"));

    for (const eventName of activityEvents) {
      expect(addSpy).not.toHaveBeenCalledWith(
        eventName,
        expect.any(Function),
        expect.anything(),
      );
    }
    expect(sendMessageToBackground).not.toHaveBeenCalled();

    addSpy.mockRestore();
  });
});
