import React, { useState } from "react";
import { render, act, screen, fireEvent } from "@testing-library/react";

import { SlideupModal, SLIDEUP_MODAL_TRANSITION_MS } from "..";

/**
 * Mirrors a real call site: a trigger outside the sheet, so focus has somewhere
 * to return to.
 */
const Harness = ({ ariaLabel }: { ariaLabel?: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        data-testid="trigger"
        onClick={() => setIsOpen(true)}
      >
        open
      </button>
      <SlideupModal
        isModalOpen={isOpen}
        setIsModalOpen={setIsOpen}
        ariaLabel={ariaLabel}
      >
        <button type="button" data-testid="sheet-button">
          inside
        </button>
      </SlideupModal>
    </>
  );
};

describe("SlideupModal", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("exposes dialog semantics with an accessible name", () => {
    render(<Harness ariaLabel="Hidden collectibles" />);

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Hidden collectibles");
  });

  it("moves focus to the sheet on open and restores it on close", () => {
    render(<Harness ariaLabel="Sheet" />);

    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    fireEvent.click(trigger);

    // The card itself takes focus, not the first control inside it -- a focus
    // ring on a button would be a visible change on every sheet.
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(document.activeElement).toBe(dialog);

    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      jest.advanceTimersByTime(SLIDEUP_MODAL_TRANSITION_MS);
    });

    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape while open, and ignores it while closed", () => {
    const setIsModalOpen = jest.fn();

    const { rerender } = render(
      <SlideupModal
        isModalOpen={false}
        setIsModalOpen={setIsModalOpen}
        ariaLabel="Sheet"
      >
        <div>content</div>
      </SlideupModal>,
    );

    // Several sheets are mounted at once on a screen; a closed one must not
    // swallow the key from the open one.
    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      jest.advanceTimersByTime(SLIDEUP_MODAL_TRANSITION_MS);
    });
    expect(setIsModalOpen).not.toHaveBeenCalled();

    rerender(
      <SlideupModal
        isModalOpen={true}
        setIsModalOpen={setIsModalOpen}
        ariaLabel="Sheet"
      >
        <div>content</div>
      </SlideupModal>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      jest.advanceTimersByTime(SLIDEUP_MODAL_TRANSITION_MS);
    });
    expect(setIsModalOpen).toHaveBeenCalledWith(false);
  });
});
