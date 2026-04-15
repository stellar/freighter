import { renderHook } from "@testing-library/react";
import { useMarkQueueActive } from "../useMarkQueueActive";
import * as internal from "@shared/api/internal";

jest.mock("@shared/api/internal", () => ({
  markQueueActive: jest.fn(),
}));

describe("useMarkQueueActive", () => {
  const mockMarkQueueActive = internal.markQueueActive as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("marks queue as active on mount", () => {
    renderHook(() => useMarkQueueActive("test-uuid"));

    expect(mockMarkQueueActive).toHaveBeenCalledWith({
      uuid: "test-uuid",
      isActive: true,
    });
  });

  it("marks queue as inactive on unmount", () => {
    const { unmount } = renderHook(() => useMarkQueueActive("test-uuid"));

    // Clear the mount call
    mockMarkQueueActive.mockClear();

    unmount();

    expect(mockMarkQueueActive).toHaveBeenCalledWith({
      uuid: "test-uuid",
      isActive: false,
    });
  });

  it("does not call markQueueActive when uuid is empty", () => {
    renderHook(() => useMarkQueueActive(""));

    expect(mockMarkQueueActive).not.toHaveBeenCalled();
  });

  it("updates active state when uuid changes", () => {
    const { rerender } = renderHook(({ uuid }) => useMarkQueueActive(uuid), {
      initialProps: { uuid: "uuid-1" },
    });

    expect(mockMarkQueueActive).toHaveBeenCalledWith({
      uuid: "uuid-1",
      isActive: true,
    });

    mockMarkQueueActive.mockClear();

    rerender({ uuid: "uuid-2" });

    // Should deactivate old and activate new
    expect(mockMarkQueueActive).toHaveBeenCalledWith({
      uuid: "uuid-1",
      isActive: false,
    });
    expect(mockMarkQueueActive).toHaveBeenCalledWith({
      uuid: "uuid-2",
      isActive: true,
    });
  });
});
