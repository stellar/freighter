import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { InfoSheetContent } from "popup/components/InfoBottomSheet";
import { SheetHeaderLayout } from "popup/components/SheetHeader";

describe("InfoSheetContent", () => {
  it("renders the shared header with a bare X and no badge", async () => {
    const onClose = jest.fn();
    render(
      <InfoSheetContent
        data-testid="sheet"
        closeTestId="sheet-close"
        title="Verified token"
        onClose={onClose}
      >
        Body
      </InfoSheetContent>,
    );

    const sheet = screen.getByTestId("sheet");
    expect(sheet.querySelector(".SheetHeader--inline")).not.toBeNull();
    expect(sheet.querySelector(".InfoSheet__badge")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Verified token" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("sheet-close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("leaves the action button out when no label is given", () => {
    render(
      <InfoSheetContent title="Unverified token" onClose={jest.fn()}>
        Body
      </InfoSheetContent>,
    );

    // The X is the only button.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("pins the action in the footer and dismisses with it by default", async () => {
    const onClose = jest.fn();
    render(
      <InfoSheetContent
        data-testid="sheet"
        title="Trustline"
        actionLabel="Got it"
        onClose={onClose}
      >
        Body
      </InfoSheetContent>,
    );

    const action = screen.getByRole("button", { name: "Got it" });
    expect(action).toHaveClass("Button--secondary");
    expect(action.closest(".SheetLayout__footer")).not.toBeNull();

    await userEvent.click(action);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stacks the header and runs a destructive action instead of dismissing", async () => {
    const onClose = jest.fn();
    const onAction = jest.fn();
    render(
      <InfoSheetContent
        data-testid="sheet"
        actionTestId="sheet-action"
        headerLayout={SheetHeaderLayout.Stacked}
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
      screen.getByTestId("sheet").querySelector(".SheetHeader--stacked"),
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

  it("renders in flow, without the sheet layout, when inline", () => {
    render(
      <InfoSheetContent
        isInline
        data-testid="sheet"
        title="Trustline"
        actionLabel="Got it"
        onClose={jest.fn()}
      >
        Body
      </InfoSheetContent>,
    );

    const sheet = screen.getByTestId("sheet");
    expect(sheet).toHaveClass("InfoSheet--inline");
    expect(sheet.querySelector(".SheetLayout")).toBeNull();
  });
});
