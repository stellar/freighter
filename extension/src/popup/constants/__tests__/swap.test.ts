import { SwapSource, isSwapSource } from "popup/constants/swap";

describe("SwapSource", () => {
  it("accepts the tags producers actually emit", () => {
    expect(isSwapSource(SwapSource.TokenDetails)).toBe(true);
  });

  it("rejects anything outside the closed set", () => {
    // `?source=` is attacker-controllable via a crafted popup URL, and the
    // value ends up on `swap.completed`. Membership is the whole gate.
    expect(isSwapSource("token_details_evil")).toBe(false);
    expect(isSwapSource("__proto__")).toBe(false);
    expect(isSwapSource("")).toBe(false);
    // Earn's swap is a sheet inside Earn, never the route, and Home is the
    // route's default rather than a param.
    expect(isSwapSource(SwapSource.Earn)).toBe(false);
    expect(isSwapSource(SwapSource.Home)).toBe(false);
    expect(isSwapSource(null)).toBe(false);
  });
});
