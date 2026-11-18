import { SwapSource } from "popup/constants/swap";
import { swapSourceProps } from "popup/metrics/swap";

describe("swapSourceProps", () => {
  it("tags a swap opened from Earn or a token's details", () => {
    expect(swapSourceProps(SwapSource.Earn)).toEqual({ source: "earn" });
    expect(swapSourceProps(SwapSource.TokenDetails)).toEqual({
      source: "token_details",
    });
  });

  it("leaves a swap opened from Home untagged", () => {
    expect(swapSourceProps(null)).toEqual({});
    expect(swapSourceProps(undefined)).toEqual({});
  });
});
