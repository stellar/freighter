import { SwapSource } from "popup/constants/swap";
import { swapSourceProps } from "popup/metrics/swap";

describe("swapSourceProps", () => {
  it("tags where the swap was opened from", () => {
    expect(swapSourceProps(SwapSource.Home)).toEqual({ source: "home" });
    expect(swapSourceProps(SwapSource.Earn)).toEqual({ source: "earn" });
    expect(swapSourceProps(SwapSource.TokenDetails)).toEqual({
      source: "token_details",
    });
  });

  it("leaves the tag off when no host set one", () => {
    expect(swapSourceProps(null)).toEqual({});
    expect(swapSourceProps(undefined)).toEqual({});
  });
});
