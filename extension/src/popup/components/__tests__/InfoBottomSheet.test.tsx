import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Icon } from "@stellar/design-system";

import { InfoSheetContent } from "popup/components/InfoBottomSheet";

describe("InfoSheetContent", () => {
  it("renders a badge and a dismiss button by default", async () => {
    const onClose = jest.fn();
    render(
      <InfoSheetContent
        data-testid="sheet"
        icon={<Icon.CheckVerified01 />}
        title="Verified token"
        actionLabel="Got it"
        onClose={onClose}
      >
        Body
      </InfoSheetContent>,
    );

    expect(
      screen.getByTestId("sheet").querySelector(".InfoSheet__badge"),
    ).not.toBeNull();
    const action = screen.getByRole("button", { name: "Got it" });
    expect(action).toHaveClass("Button--secondary");

    await userEvent.click(action);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders a red badge and runs a destructive action instead of dismissing", async () => {
    const onClose = jest.fn();
    const onAction = jest.fn();
    render(
      <InfoSheetContent
        data-testid="sheet"
        actionTestId="sheet-action"
        icon={<Icon.InfoCircle />}
        badgeVariant="error"
        title="Forgot your password?"
        actionLabel="Reset wallet"
        actionVariant="destructive"
        onAction={onAction}
        onClose={onClose}
      >
        Body
      </InfoSheetContent>,
    );

    expect(
      screen.getByTestId("sheet").querySelector(".InfoSheet__badge--error"),
    ).not.toBeNull();
    const action = screen.getByTestId("sheet-action");
    expect(action).toHaveClass("Button--destructive");

    await userEvent.click(action);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("disables the action while it is loading", () => {
    render(
      <InfoSheetContent
        actionTestId="sheet-action"
        icon={<Icon.InfoCircle />}
        title="Forgot your password?"
        actionLabel="Reset wallet"
        onAction={jest.fn()}
        onClose={jest.fn()}
        isActionLoading
      >
        Body
      </InfoSheetContent>,
    );

    expect(screen.getByTestId("sheet-action")).toBeDisabled();
  });
});
