import { renderHook } from "@testing-library/react";

import { emitScreenViewed } from "helpers/metrics";
import {
  ScreenByStep,
  useStepScreenViews,
} from "popup/helpers/useStepScreenViews";

jest.mock("helpers/metrics", () => ({
  ...jest.requireActual("helpers/metrics"),
  emitScreenViewed: jest.fn(),
}));

type Step = "amount" | "review" | "submitting";
const screens: ScreenByStep<Step> = {
  amount: { screen_name: "x_amount", flow: "swap" },
  review: { screen_name: "x_review", flow: "swap" },
};

describe("useStepScreenViews", () => {
  beforeEach(() => jest.clearAllMocks());

  it("emits each step once, with the extra props", () => {
    const { rerender } = renderHook(
      ({ step }: { step: Step }) =>
        useStepScreenViews(step, screens, { source: "earn" }),
      { initialProps: { step: "amount" as Step } },
    );
    rerender({ step: "amount" });
    rerender({ step: "review" });

    expect((emitScreenViewed as jest.Mock).mock.calls).toEqual([
      ["x_amount", { flow: "swap", source: "earn" }],
      ["x_review", { flow: "swap", source: "earn" }],
    ]);
  });

  it("emits nothing for a step without a screen", () => {
    renderHook(() => useStepScreenViews<Step>("submitting", screens));

    expect(emitScreenViewed).not.toHaveBeenCalled();
  });
});
