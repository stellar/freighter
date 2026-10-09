import {
  closeWindow,
  forgetNativeWindowClose,
  rememberNativeWindowClose,
} from "popup/helpers/navigate";

describe("closeWindow", () => {
  afterEach(() => {
    forgetNativeWindowClose();
    jest.restoreAllMocks();
  });

  // Outside the sidebar nothing replaces window.close, so this is the popup
  // closing itself. window.close is looked up when closeWindow runs, not
  // captured when the module loads: a spy installed after that still sees the
  // call, whereas a load-time capture would be jsdom's real close, which
  // empties the test document.
  it("closes through window.close", () => {
    const windowClose = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);

    closeWindow();

    expect(windowClose).toHaveBeenCalledTimes(1);
  });

  // In the sidebar window.close is "navigate home", so SidebarSigningListener
  // hands over the real one.
  it("calls the native close it was handed instead of window.close", () => {
    const windowClose = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    const nativeClose = jest.fn();
    rememberNativeWindowClose(nativeClose);

    closeWindow();

    expect(nativeClose).toHaveBeenCalledTimes(1);
    expect(windowClose).not.toHaveBeenCalled();
  });

  it("goes back to window.close once the native close is forgotten", () => {
    const windowClose = jest
      .spyOn(window, "close")
      .mockImplementation(() => undefined);
    const nativeClose = jest.fn();
    rememberNativeWindowClose(nativeClose);
    forgetNativeWindowClose();

    closeWindow();

    expect(windowClose).toHaveBeenCalledTimes(1);
    expect(nativeClose).not.toHaveBeenCalled();
  });
});
