import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SheetHeader, SheetHeaderLayout } from "popup/components/SheetHeader";

describe("SheetHeader", () => {
  it("renders nothing without a title, a leading element or an X", () => {
    const { container } = render(<SheetHeader />);

    expect(container).toBeEmptyDOMElement();
  });

  it("puts the title and the X on one row by default", async () => {
    const onClose = jest.fn();
    const { container } = render(
      <SheetHeader title="Hide tokens" onClose={onClose} closeTestId="close" />,
    );

    expect(container.firstChild).toHaveClass("SheetHeader--inline");
    expect(
      screen.getByRole("heading", { name: "Hide tokens" }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stacks by default when given a leading element", () => {
    const { container } = render(
      <SheetHeader
        leading={<button type="button">Settings</button>}
        onClose={jest.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass("SheetHeader--stacked");
    expect(
      screen.getByRole("button", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("centers the title with no X when onClose is left out", () => {
    const { container } = render(
      <SheetHeader title="Review send" layout={SheetHeaderLayout.Centered} />,
    );

    expect(container.firstChild).toHaveClass("SheetHeader--centered");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
