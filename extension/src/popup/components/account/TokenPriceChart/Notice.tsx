import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import {
  ApiTokenPriceHistoryPoint,
  TokenPriceHistoryRange,
} from "@shared/api/types";
import { hasChartData } from "popup/helpers/tokenPriceHistory";

import { EXPECTED_POINTS_BY_RANGE, SPARSE_COVERAGE_RATIO } from "./constants";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

export enum TokenChartNoticeVariant {
  // §4.4 rule 2: the warning banner is the entire intervention — chart,
  // price, and deltas display normally under it (the Blockaid pattern).
  LowVolume = "low-volume",
  // §4.4 rule 4: below ~33% of the range's expected points.
  LimitedData = "limited-data",
  // lowVolume: null — the verdict's upstream input failed. Never the
  // manipulation copy (accusing every token during a blip burns the banner's
  // credibility) and never silence.
  VerdictUnavailable = "verdict-unavailable",
}

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
}: {
  lowVolume: boolean | null;
  points: ApiTokenPriceHistoryPoint[];
  range: string;
  resolutionSeconds: number;
  nowSeconds: number;
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
    return TokenChartNoticeVariant.LimitedData;
  }
  return null;
};

/**
 * Three copy variants, styled after the Blockaid warning banners. Real text
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
