import React from "react";
import { act, render, screen } from "@testing-library/react";

import { SheetLayout } from "popup/components/SheetLayout";

const setScrollMetrics = (
  el: HTMLElement,
  {
    scrollTop,
    clientHeight,
    scrollHeight,
  }: { scrollTop: number; clientHeight: number; scrollHeight: number },
) => {
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(el, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  // eslint-disable-next-line no-param-reassign
  el.scrollTop = scrollTop;
};

describe("SheetLayout", () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it("pins the header and the footer around the body", () => {
    render(
      <SheetLayout header={<span>Header</span>} footer={<span>Footer</span>}>
        Body
      </SheetLayout>,
    );

    expect(
      screen.getByText("Header").closest(".SheetLayout__header"),
    ).not.toBeNull();
    expect(
      screen.getByText("Footer").closest(".SheetLayout__footer"),
    ).not.toBeNull();
    expect(screen.getByText("Body")).toHaveClass("SheetLayout__body");
  });

  it("shows each edge fade only while there is more content behind it", () => {
    render(
      <div data-testid="scroller" style={{ overflowY: "auto" }}>
        <SheetLayout footer={<span>Footer</span>}>Body</SheetLayout>
      </div>,
    );
    const scroller = screen.getByTestId("scroller");
    const top = screen.getByTestId("sheet-edge-fade-top");
    const bottom = screen.getByTestId("sheet-edge-fade-bottom");

    // At the top of a long sheet: only the bottom fade.
    setScrollMetrics(scroller, {
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 300,
    });
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(top).not.toHaveClass("SheetLayout__fade--visible");
    expect(bottom).toHaveClass("SheetLayout__fade--visible");

    // Scrolled to the end: only the top fade.
    setScrollMetrics(scroller, {
      scrollTop: 200,
      clientHeight: 100,
      scrollHeight: 300,
    });
    act(() => {
      scroller.dispatchEvent(new Event("scroll"));
    });
    expect(top).toHaveClass("SheetLayout__fade--visible");
    expect(bottom).not.toHaveClass("SheetLayout__fade--visible");
  });

  it("shows no fade when everything fits", () => {
    render(
      <div style={{ overflowY: "auto" }}>
        <SheetLayout>Body</SheetLayout>
      </div>,
    );

    expect(screen.getByTestId("sheet-edge-fade-top")).not.toHaveClass(
      "SheetLayout__fade--visible",
    );
    expect(screen.getByTestId("sheet-edge-fade-bottom")).not.toHaveClass(
      "SheetLayout__fade--visible",
    );
  });
});
