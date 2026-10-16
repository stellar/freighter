import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { HiddenItemsSheet } from "popup/components/HiddenItemsSheet";

const renderSheet = (
  props: Partial<React.ComponentProps<typeof HiddenItemsSheet>> = {},
) =>
  render(
    <>
      <button type="button" data-testid="opener">
        Show hidden
      </button>
      <HiddenItemsSheet
        isOpen
        onClose={jest.fn()}
        title="Hidden tokens"
        emptyText="No hidden tokens"
        rows={[]}
        data-testid="sheet"
        {...props}
      />
    </>,
  );

describe("HiddenItemsSheet", () => {
  it("is a dialog named by its title", () => {
    renderSheet();

    expect(
      screen.getByRole("dialog", { name: "Hidden tokens" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sheet-empty")).toHaveTextContent(
      "No hidden tokens",
    );
  });

  it("renders a row per hidden item instead of the empty state", () => {
    renderSheet({
      rows: [<div key="a">Row A</div>, <div key="b">Row B</div>],
    });

    expect(screen.getByText("Row A")).toBeInTheDocument();
    expect(screen.getByText("Row B")).toBeInTheDocument();
    expect(screen.queryByTestId("sheet-empty")).not.toBeInTheDocument();
  });

  it("moves keyboard focus inside the sheet when it opens", async () => {
    renderSheet();

    const dialog = screen.getByRole("dialog");
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  it("closes on Escape", async () => {
    const onClose = jest.fn();
    renderSheet({ onClose });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("closes from the X icon and the Close button", () => {
    const onClose = jest.fn();
    renderSheet({ onClose });

    fireEvent.click(screen.getByTestId("sheet-close"));
    fireEvent.click(screen.getByTestId("sheet-close-button"));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("returns focus to the opener when it closes", async () => {
    const { rerender } = render(
      <>
        <button type="button" data-testid="opener">
          Show hidden
        </button>
        <HiddenItemsSheet
          isOpen={false}
          onClose={jest.fn()}
          title="Hidden tokens"
          emptyText="No hidden tokens"
          rows={[]}
          data-testid="sheet"
        />
      </>,
    );
    const opener = screen.getByTestId("opener");
    opener.focus();
    expect(opener).toHaveFocus();

    rerender(
      <>
        <button type="button" data-testid="opener">
          Show hidden
        </button>
        <HiddenItemsSheet
          isOpen
          onClose={jest.fn()}
          title="Hidden tokens"
          emptyText="No hidden tokens"
          rows={[]}
          data-testid="sheet"
        />
      </>,
    );
    await waitFor(() => expect(opener).not.toHaveFocus());

    rerender(
      <>
        <button type="button" data-testid="opener">
          Show hidden
        </button>
        <HiddenItemsSheet
          isOpen={false}
          onClose={jest.fn()}
          title="Hidden tokens"
          emptyText="No hidden tokens"
          rows={[]}
          data-testid="sheet"
        />
      </>,
    );
    await waitFor(() => expect(opener).toHaveFocus());
  });
});
