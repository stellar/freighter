import React from "react";
import { toast } from "sonner";

import { showToast } from "popup/basics/shadcn/Toast";

describe("showToast", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("dismisses the toast on screen before showing the next one", () => {
    const dismissSpy = jest.spyOn(toast, "dismiss");
    const customSpy = jest.spyOn(toast, "custom");

    showToast(() => <div>first</div>);
    showToast(() => <div>second</div>);

    expect(dismissSpy).toHaveBeenCalledTimes(2);
    expect(dismissSpy).toHaveBeenLastCalledWith();
    expect(customSpy).toHaveBeenCalledTimes(2);
    expect(dismissSpy.mock.invocationCallOrder[1]).toBeLessThan(
      customSpy.mock.invocationCallOrder[1],
    );
  });

  it("gives each toast a fresh id", () => {
    const first = showToast(() => <div>first</div>);
    const second = showToast(() => <div>second</div>);

    expect(first).not.toEqual(second);
  });
});
