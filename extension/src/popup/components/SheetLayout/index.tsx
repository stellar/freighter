import React, { useCallback, useEffect, useRef, useState } from "react";

import "./styles.scss";

interface SheetLayoutProps {
  /** Usually a `SheetHeader`. Stays pinned at the top while the body scrolls. */
  header?: React.ReactNode;
  /** The action row. Stays pinned at the bottom while the body scrolls. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Stretches to the host's full height so the footer sits at its bottom
   * even when the body is short. For page hosts; sheets size to content. */
  fill?: boolean;
  "data-testid"?: string;
}

const isScrollable = (el: HTMLElement) => {
  const { overflowY } = window.getComputedStyle(el);
  return overflowY === "auto" || overflowY === "scroll";
};

const findScrollParent = (el: HTMLElement | null) => {
  let node = el?.parentElement ?? null;
  while (node) {
    if (isScrollable(node)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

/**
 * Content frame for a bottom sheet: 24px padding, a header pinned at the top
 * and a footer pinned at the bottom, with the body scrolling between them once
 * the sheet reaches its max height. The scrolling itself is the card's
 * (`SlideupModal` scrolls internally), so the header and footer pin with
 * `position: sticky` against it.
 *
 * Like mobile, a 24px fade shows at an edge only while there is more content
 * behind it: under the header once scrolled, above the footer until the end.
 */
export const SheetLayout = ({
  header,
  footer,
  children,
  fill = false,
  "data-testid": dataTestId,
}: SheetLayoutProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [fades, setFades] = useState({ top: false, bottom: false });

  const update = useCallback((scroller: HTMLElement) => {
    const { scrollTop, clientHeight, scrollHeight } = scroller;
    const next = {
      top: scrollTop > 1,
      bottom: scrollTop + clientHeight < scrollHeight - 1,
    };
    setFades((prev) =>
      prev.top === next.top && prev.bottom === next.bottom ? prev : next,
    );
  }, []);

  useEffect(() => {
    const scroller = findScrollParent(ref.current);
    if (!scroller) {
      return undefined;
    }

    const onChange = () => update(scroller);
    onChange();
    scroller.addEventListener("scroll", onChange, { passive: true });
    // The card animates its height and the content can change size, either
    // of which can start or stop the overflow without a scroll event.
    const observer = new ResizeObserver(onChange);
    observer.observe(scroller);
    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      scroller.removeEventListener("scroll", onChange);
      observer.disconnect();
    };
  }, [update]);

  const classNames = [
    "SheetLayout",
    header ? "SheetLayout--has-header" : "",
    footer ? "SheetLayout--has-footer" : "",
    fill ? "SheetLayout--fill" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} ref={ref} data-testid={dataTestId}>
      <div className="SheetLayout__top">
        {header && <div className="SheetLayout__header">{header}</div>}
        <div
          className={`SheetLayout__fade SheetLayout__fade--top${
            fades.top ? " SheetLayout__fade--visible" : ""
          }`}
          data-testid="sheet-edge-fade-top"
          aria-hidden="true"
        />
      </div>
      <div className="SheetLayout__body">{children}</div>
      <div className="SheetLayout__bottom">
        <div
          className={`SheetLayout__fade SheetLayout__fade--bottom${
            fades.bottom ? " SheetLayout__fade--visible" : ""
          }`}
          data-testid="sheet-edge-fade-bottom"
          aria-hidden="true"
        />
        {footer && <div className="SheetLayout__footer">{footer}</div>}
      </div>
    </div>
  );
};
