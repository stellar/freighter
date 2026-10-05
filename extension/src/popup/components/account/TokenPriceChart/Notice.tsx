import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import {
  ApiTokenPriceHistory,
  ApiTokenPriceHistoryPoint,
  TokenPriceHistoryRange,
} from "@shared/api/types";
import { hasChartData } from "popup/helpers/tokenPriceHistory";

import {
  EXPECTED_POINTS_BY_RANGE,
  RANGE_WINDOW_SECONDS,
  SPARSE_COVERAGE_RATIO,
} from "./constants";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

export enum TokenChartNoticeVariant {
  // §4.4 rule 2: the warning banner is the entire intervention — chart,
  // price, and deltas display normally under it (the Blockaid pattern).
  LowVolume = "low-volume",
  // §4.4 rule 4: below ~33% of the range's expected points.
  LimitedData = "limited-data",
  // Limited-data whose shortfall is explained by the token's age.
  NewlyTraded = "newly-traded",
  // lowVolume: null — the verdict's upstream input failed. Never the
  // manipulation copy (accusing every token during a blip burns the banner's
  // credibility) and never silence.
  VerdictUnavailable = "verdict-unavailable",
}

const NARROWING_ORDER = [
  TokenPriceHistoryRange.OneYear,
  TokenPriceHistoryRange.OneMonth,
  TokenPriceHistoryRange.OneWeek,
  TokenPriceHistoryRange.OneDay,
  TokenPriceHistoryRange.OneHour,
];

/**
 * The earliest the token's first trade can be: the start of ALL's first
 * bucket, narrowed by each finer cached range whose window (measured from
 * when it was fetched) reaches back to the bound — every trade then falls
 * inside that range, so its first bucket holds the first trade. Without the
 * narrowing, ALL's two-week buckets put a token launched today before the 1D
 * window. Undefined until ALL is cached.
 */
export const getFirstTradeLowerBound = (
  cachedByRange: Partial<
    Record<string, ApiTokenPriceHistory & { updatedAt: number }>
  >,
  nowSeconds: number,
): number | undefined => {
  let bound = cachedByRange[TokenPriceHistoryRange.All]?.points[0]?.t;
  if (bound === undefined) {
    return undefined;
  }
  for (const range of NARROWING_ORDER) {
    const entry = cachedByRange[range];
    const firstT = entry?.points[0]?.t;
    if (entry && firstT !== undefined) {
      const fetchedAtSeconds = Math.min(entry.updatedAt / 1000, nowSeconds);
      if (fetchedAtSeconds - RANGE_WINDOW_SECONDS[range] <= bound) {
        bound = Math.max(bound, firstT);
      }
    }
  }
  return bound;
};

/**
 * The backend returns only buckets that traded, so a series' first point is
 * the first trade in the window, not the token's first trade: an old token
 * that traded only in the last hour looks young from its own series. Only
 * `firstTradeSeconds` can rule that out, and it is a lower bound, so an
 * unknown or straddling first trade stays limited-data.
 */
const isNewlyTraded = ({
  points,
  range,
  resolutionSeconds,
  nowSeconds,
  firstTradeSeconds,
}: {
  points: ApiTokenPriceHistoryPoint[];
  range: string;
  resolutionSeconds: number;
  nowSeconds: number;
  firstTradeSeconds?: number;
}) => {
  const windowSeconds = RANGE_WINDOW_SECONDS[range];
  if (
    !windowSeconds ||
    firstTradeSeconds === undefined ||
    resolutionSeconds <= 0 ||
    firstTradeSeconds <= nowSeconds - windowSeconds
  ) {
    return false;
  }
  const expectedSinceFirstPoint = Math.ceil(
    (nowSeconds - points[0].t) / resolutionSeconds,
  );
  return points.length >= expectedSinceFirstPoint * SPARSE_COVERAGE_RATIO;
};

/**
 * Low-volume beats limited-data (low volume commonly causes the sparseness
 * and its copy explains both); so does a null verdict. No chart, no notice.
 */
export const getNoticeVariant = ({
  lowVolume,
  points,
  range,
  resolutionSeconds,
  nowSeconds,
  firstTradeSeconds,
  rangesSettled = true,
}: {
  lowVolume: boolean | null;
  points: ApiTokenPriceHistoryPoint[];
  range: string;
  resolutionSeconds: number;
  nowSeconds: number;
  /** From {@link getFirstTradeLowerBound}. */
  firstTradeSeconds?: number;
  /** False while other ranges are still loading: the first-trade bound can
   * still move, so limited-data could flip to newly-traded on screen. */
  rangesSettled?: boolean;
}): TokenChartNoticeVariant | null => {
  if (!hasChartData(points)) {
    return null;
  }
  const pointCount = points.length;
  if (lowVolume === true) {
    return TokenChartNoticeVariant.LowVolume;
  }
  if (lowVolume === null) {
    return TokenChartNoticeVariant.VerdictUnavailable;
  }
  // ALL starts before the network, so the fixed count would flag every token
  // younger than XLM; measure it against the token's own first bucket.
  const expectedPoints =
    range === TokenPriceHistoryRange.All && resolutionSeconds > 0
      ? Math.ceil((nowSeconds - points[0].t) / resolutionSeconds)
      : EXPECTED_POINTS_BY_RANGE[range];
  if (expectedPoints && pointCount < expectedPoints * SPARSE_COVERAGE_RATIO) {
    if (!rangesSettled) {
      return null;
    }
    return isNewlyTraded({
      points,
      range,
      resolutionSeconds,
      nowSeconds,
      firstTradeSeconds,
    })
      ? TokenChartNoticeVariant.NewlyTraded
      : TokenChartNoticeVariant.LimitedData;
  }
  return null;
};

/**
 * Four copy variants, styled after the Blockaid warning banners. Real text
 * so screen readers announce it.
 */
export const TokenChartNotice = ({
  variant,
}: {
  variant: TokenChartNoticeVariant;
}) => {
  const { t } = useTranslation();

  const copyByVariant = {
    [TokenChartNoticeVariant.LowVolume]: {
      title: t("Low trading volume"),
      body: t(
        "This token has low trading volume, so price data may be less reliable.",
      ),
    },
    [TokenChartNoticeVariant.LimitedData]: {
      title: t("Limited trading data"),
      body: t("Price history is limited for this period."),
    },
    [TokenChartNoticeVariant.NewlyTraded]: {
      title: t("Newly traded token"),
      body: t(
        "Price history is limited because this token started trading recently.",
      ),
    },
    [TokenChartNoticeVariant.VerdictUnavailable]: {
      title: t("Couldn't verify trading activity"),
      body: t("Price data may be less reliable for this token."),
    },
  };
  const copy = copyByVariant[variant];

  return (
    <div
      className={`TokenChartNotice TokenChartNotice--${variant}`}
      data-testid="TokenChartNotice"
      data-variant={variant}
    >
      <div className="TokenChartNotice__header">
        <Icon.AlertTriangle className="TokenChartNotice__icon" />
        <div>{copy.title}</div>
      </div>
      <div className="TokenChartNotice__body">{copy.body}</div>
    </div>
  );
};
