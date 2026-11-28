import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  SheetHeader,
  SheetHeaderIconTone,
  SheetHeaderLayout,
} from "popup/components/SheetHeader";

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

  it("puts a leading element before an inline title, with a subtitle under it", () => {
    const { container } = render(
      <SheetHeader
        layout={SheetHeaderLayout.Inline}
        leading={<img alt="USDC" />}
        title="Deposited USDC"
        subtitle="Nov 19, 2026"
        subtitleTestId="subtitle"
        onClose={jest.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass("SheetHeader--inline");
    const [leading, titles] = Array.from(
      (container.firstChild as HTMLElement).children,
    );
    expect(leading).toContainElement(screen.getByRole("img", { name: "USDC" }));
    expect(titles).toContainElement(
      screen.getByRole("heading", { name: "Deposited USDC" }),
    );
    expect(screen.getByTestId("subtitle")).toHaveTextContent("Nov 19, 2026");
  });

  it("leaves a title without a subtitle unwrapped", () => {
    const { container } = render(<SheetHeader title="Hide tokens" />);

    expect(container.querySelector(".SheetHeader__titles")).toBeNull();
  });

  it("draws every header icon in one tone when asked", () => {
    const { container } = render(
      <SheetHeader
        title="Receive funds"
        layout={SheetHeaderLayout.Centered}
        iconTone={SheetHeaderIconTone.Primary}
        onClose={jest.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass("SheetHeader--icons-primary");
  });

  it("leaves the icons' default colours alone without a tone", () => {
    const { container } = render(
      <SheetHeader title="Hide tokens" onClose={jest.fn()} />,
    );

    expect((container.firstChild as HTMLElement).className).not.toMatch(
      /--icons-/,
    );
  });
});
