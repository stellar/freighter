import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

import { TokenPriceHistoryRange } from "@shared/api/types/types";

import { TokenPriceHistoryRangeValue } from "helpers/hooks/useGetTokenPriceHistory";
import { TIMEFRAME_ORDER } from "./constants";

/**
 * The user-facing label for a range. The enum value stays the request/ID
 * spelling; the label goes through `t` like all other copy, as literal keys
 * so the locale build tool can find them.
 */
export const formatRangeLabel = (
  range: TokenPriceHistoryRangeValue,
  t: TFunction,
): string => {
  switch (range) {
    case TokenPriceHistoryRange.OneHour:
      return t("1H");
    case TokenPriceHistoryRange.OneDay:
      return t("1D");
    case TokenPriceHistoryRange.OneWeek:
      return t("1W");
    case TokenPriceHistoryRange.OneMonth:
      return t("1M");
    case TokenPriceHistoryRange.OneYear:
      return t("1Y");
    case TokenPriceHistoryRange.All:
      return t("ALL");
    default:
      return range;
  }
};

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

interface TimeframeSelectorProps {
  selectedRange: TokenPriceHistoryRangeValue;
  onSelect: (range: TokenPriceHistoryRangeValue) => void;
  /** Id of the tabpanel these tabs control (the chart canvas). */
  panelId: string;
  /** Prefix for each tab's own id, so the panel can point back at the active one. */
  tabIdPrefix: string;
}

/**
 * Always visible; nothing here knows which ranges carry data. Implements the
 * WAI-ARIA tabs keyboard pattern (Arrow/Home/End), not just the roles.
 */
export const TimeframeSelector = ({
  selectedRange,
  onSelect,
  panelId,
  tabIdPrefix,
}: TimeframeSelectorProps) => {
  const { t } = useTranslation();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const focusTab = (index: number) => {
    // Wrap: Right from the last lands on the first, matching the pattern's
    // default for a non-scrollable tablist.
    const count = TIMEFRAME_ORDER.length;
    const nextIndex = (index + count) % count;
    onSelect(TIMEFRAME_ORDER[nextIndex]);
    tabRefs.current[nextIndex]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusTab(index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusTab(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(TIMEFRAME_ORDER.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="TimeframeSelector"
      role="tablist"
      aria-label={t("Price chart timeframe")}
    >
      {TIMEFRAME_ORDER.map((range, index) => {
        const isSelected = range === selectedRange;
        return (
          <button
            key={range}
            type="button"
            role="tab"
            id={`${tabIdPrefix}-${range}`}
            // Every tab points at the one panel below: the chart is a single
            // region whose contents swap, not six panels. Without this a
            // screen reader announces "tab" with nothing to navigate to.
            aria-controls={panelId}
            aria-selected={isSelected}
            // Roving tabindex: the tablist is a single tab stop, and Tab from
            // it moves past the whole group rather than into the next range.
            tabIndex={isSelected ? 0 : -1}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            className={`TimeframeSelector__tab ${
              isSelected ? "TimeframeSelector__tab--selected" : ""
            }`}
            data-testid={`TokenPriceChart__range-${range}`}
            onClick={() => onSelect(range)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {formatRangeLabel(range, t)}
          </button>
        );
      })}
    </div>
  );
};
