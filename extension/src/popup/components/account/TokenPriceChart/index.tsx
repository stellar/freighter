import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { BigNumber } from "bignumber.js";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import {
  ApiTokenPriceHistory,
  TokenPriceHistoryRange,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  TokenPriceHistoryRangeValue,
  useGetTokenPriceHistory,
} from "helpers/hooks/useGetTokenPriceHistory";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { getChartAssetIdentity } from "popup/helpers/token";
import { hasChartData } from "popup/helpers/tokenPriceHistory";
import { tokenPriceHistorySelector } from "popup/ducks/cache";
import { RequestState } from "constants/request";

import { ChartGhost } from "./ChartGhost";
import { computeInspectedChange } from "./inspect";
import {
  LineChart,
  getChartCoordinates,
  getPlottedRangeEnd,
  getPlottedRangeStart,
} from "./LineChart";
import { TimeframeSelector, formatRangeLabel } from "./TimeframeSelector";
import {
  TokenChartNotice,
  getFirstTradeLowerBound,
  getNoticeVariant,
} from "./Notice";
import {
  CHART_HEIGHT_PX,
  CHART_VIEWBOX_WIDTH,
  MAX_PRICE_DECIMALS,
  MAX_SUB_DOLLAR_DECIMALS,
  MIN_PRICE_DECIMALS,
  PriceDirection,
  RANGE_SWITCH_DEBOUNCE_MS,
  SUB_CENT_SIGNIFICANT_DIGITS,
  SUB_CENT_THRESHOLD,
  WARM_ORDER,
} from "./constants";

import "./styles.scss";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

/**
 * Byte-identical to mobile's `formatPriceHistoryLabel`. Below a dollar the
 * decimals adapt so micro-priced tokens don't all render as "$0.00".
 */
export const formatChartPrice = (value: BigNumber): string => {
  const absValue = value.abs();
  if (absValue.isZero()) {
    return "0.00";
  }
  if (absValue.isGreaterThanOrEqualTo(1)) {
    // toFormat, not formatAmount: the latter narrows the whole part through
    // Number and rewrites digits above 2^53.
    return absValue.toFormat(2);
  }
  if (absValue.isGreaterThanOrEqualTo(SUB_CENT_THRESHOLD)) {
    const places = Math.min(
      Math.max(
        absValue.decimalPlaces() ?? MIN_PRICE_DECIMALS,
        MIN_PRICE_DECIMALS,
      ),
      MAX_SUB_DOLLAR_DECIMALS,
    );
    return absValue.toFixed(places);
  }
  // `BigNumber.e` is floor(log10(value)), so two significant digits need
  // `1 - e` places (0.00001 → e = -5 → 6 → "0.000010").
  return absValue.toFixed(
    Math.min(
      SUB_CENT_SIGNIFICANT_DIGITS - 1 - (absValue.e ?? 0),
      MAX_PRICE_DECIMALS,
    ),
  );
};

/** The detail header's text for an inspected point's raw price. */
export const formatInspectedPriceLabel = (price: string): string =>
  `$${formatChartPrice(new BigNumber(price))}`;

/** True when the formatted price parses to zero (grouping separators stripped). */
export const isFormattedZero = (formatted: string): boolean =>
  new BigNumber(formatted.replace(/,/g, "")).isZero();

export interface SignedPercent {
  /** "+", "-", or "" — the sign always lives in the text, never in colour
   * alone (§7.4). */
  sign: string;
  /** Three-state palette: a gain is green, a loss red, a flat range neutral. */
  colorClass: PriceDirection;
  /** Magnitude only, two decimals; the sign is carried separately. */
  formatted: string;
  /** Sign + magnitude + "%", ready to render. */
  text: string;
}

/**
 * Reads both halves: the backend rounds `change.percent` to two decimals, so
 * a tiny real move can round to 0 while the absolute still carries the sign.
 */
export const resolvePriceDirection = (
  percent: BigNumber,
  absolute?: BigNumber | null,
): PriceDirection => {
  if (percent.isGreaterThan(0)) {
    return PriceDirection.Positive;
  }
  if (percent.isLessThan(0)) {
    return PriceDirection.Negative;
  }
  if (absolute?.isGreaterThan(0)) {
    return PriceDirection.Positive;
  }
  if (absolute?.isLessThan(0)) {
    return PriceDirection.Negative;
  }
  return PriceDirection.Neutral;
};

/** The sign lives in the text, never in colour alone (§7.4). */
const SIGN_BY_DIRECTION: Record<PriceDirection, string> = {
  [PriceDirection.Positive]: "+",
  [PriceDirection.Negative]: "-",
  [PriceDirection.Neutral]: "",
};

/**
 * Shared by the header delta, the 1D error fallback and the aria-label.
 * `absolute` is optional: the 1D fallback only has a percentage, and an
 * absolute is never derived from one.
 */
export const formatSignedPercent = (
  percent: BigNumber,
  absolute?: BigNumber | null,
): SignedPercent => {
  const colorClass = resolvePriceDirection(percent, absolute);
  const sign = SIGN_BY_DIRECTION[colorClass];
  // Magnitude only: the sign is carried once, by the caller, so a delta that
  // pairs the dollar term with the percentage does not print it twice.
  const formatted = percent.abs().toFixed(2);
  return {
    sign,
    colorClass,
    formatted,
    text: `${sign}${formatted}%`,
  };
};

// Intl formatter construction is the expensive part. Memoized per language,
// not a single en-US instance: these dates sit inside translated text.
const POINT_DATE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const pointDateFormatter = (language: string) => {
  const cached = POINT_DATE_FORMATTERS.get(language);
  if (cached) {
    return cached;
  }
  // With the year: on 1Y/ALL the same month-day can recur, and "Sep 15 to
  // Sep 15" tells a screen-reader user nothing about the plotted span.
  const formatter = new Intl.DateTimeFormat(language, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  POINT_DATE_FORMATTERS.set(language, formatter);
  return formatter;
};

const formatPointDate = (unixSeconds: number, language: string) =>
  pointDateFormatter(language).format(new Date(unixSeconds * 1000));

const INSPECTED_TIMESTAMP_FORMATS = {
  date: { weekday: "short", month: "short", day: "numeric" },
  dateWithYear: {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  },
  time: { hour: "numeric", minute: "2-digit" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

type InspectedTimestampFormat = keyof typeof INSPECTED_TIMESTAMP_FORMATS;

const INSPECTED_TIMESTAMP_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

const inspectedTimestampFormatter = (
  language: string,
  format: InspectedTimestampFormat,
) => {
  const key = `${language}|${format}`;
  const cached = INSPECTED_TIMESTAMP_FORMATTERS.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(
    language,
    INSPECTED_TIMESTAMP_FORMATS[format],
  );
  INSPECTED_TIMESTAMP_FORMATTERS.set(key, formatter);
  return formatter;
};

const INTRADAY_RANGES: ReadonlySet<string> = new Set([
  TokenPriceHistoryRange.OneHour,
  TokenPriceHistoryRange.OneDay,
]);
// On 1Y and ALL the same weekday and date recur across the plotted span.
const YEAR_RANGES: ReadonlySet<string> = new Set([
  TokenPriceHistoryRange.OneYear,
  TokenPriceHistoryRange.All,
]);

/** The high-row label for the inspected point, e.g. "Mon, Sep 21 at 4:03 am". */
export const formatInspectedTimestamp = ({
  unixSeconds,
  range,
  language,
  t,
}: {
  unixSeconds: number;
  range: string;
  language: string;
  t: TFunction;
}): string => {
  const date = new Date(unixSeconds * 1000);
  const datePart = inspectedTimestampFormatter(
    language,
    YEAR_RANGES.has(range) ? "dateWithYear" : "date",
  ).format(date);
  if (!INTRADAY_RANGES.has(range)) {
    return datePart;
  }
  const time = inspectedTimestampFormatter(language, "time")
    .format(date)
    .toLowerCase();
  return t("{{date}} at {{time}}", { date: datePart, time });
};

/**
 * Places a price label over the point it describes, without letting it hang
 * outside the plot.
 *
 * `left` alone would clip: a monotonic series — a token that only climbed —
 * puts one extreme at x=0 and the other at the far edge, and a constant
 * `translateX(-50%)` there leaves half the label outside the popup. So the
 * shift scales with the position instead: 0% at the left edge (the label
 * starts at its point), -100% at the right (it ends at its point), -50% and
 * therefore centred in the middle. Every label stays inside by construction,
 * at the cost of leaning off-centre as it nears an edge.
 *
 * Expressed as a ratio rather than a pixel inset because the label's width
 * varies with the price string and the locale, and nothing here can measure
 * it before paint.
 */
export const axisLabelPosition = (x: number): CSSProperties => {
  const ratio = Math.min(Math.max(x / CHART_VIEWBOX_WIDTH, 0), 1);
  return {
    left: `${ratio * 100}%`,
    transform: `translateX(-${ratio * 100}%)`,
  };
};

/**
 * Primitives only: this is reported through an effect keyed on these fields,
 * so a fresh object per render would set parent state every render and spin.
 */
export interface RangeDeltaState {
  /** The selected range is in flight — the header draws its skeleton pill,
   * never the previous range's number. */
  isLoading: boolean;
  /** The delta text, or "" when there is none to show (the coverage guard,
   * §7.3). The header's row holds its line either way. */
  text: string;
  /** Three-state palette: a gain is green, a loss red, a flat range neutral. */
  colorClass: SignedPercent["colorClass"];
  /** The inspected point's raw price while an inspection is active; the
   * header shows it in place of spot. Null otherwise. */
  inspectedPrice: string | null;
}

interface TokenPriceChartProps {
  /** The balance's canonical token id — opaque, passed through verbatim. */
  token: string;
  networkDetails: NetworkDetails;
  /** The existing 24h number — the error-state delta fallback, 1D tab only. */
  fallback24hPercent?: string | null;
  /** Must be referentially stable — it is an effect dependency. */
  onDeltaChange: (delta: RangeDeltaState) => void;
}

/**
 * The delta is reported via `onDeltaChange` rather than drawn here: the design
 * puts it in the header. Callers gate rendering (mainnet + flag); this
 * component always fetches, which also confines warming to a shown chart.
 */
export const TokenPriceChart = ({
  token,
  networkDetails,
  fallback24hPercent,
  onDeltaChange,
}: TokenPriceChartProps) => {
  const { t, i18n } = useTranslation();
  // Stable per-instance ids for the tabs<->panel association. `useId` rather
  // than a module constant: the ids must be unique if this section is ever
  // mounted twice on one page.
  const idBase = useId();
  const chartPanelId = `${idBase}-chart-panel`;
  const chartTabIdPrefix = `${idBase}-chart-tab`;
  const [selectedRange, setSelectedRange] =
    useState<TokenPriceHistoryRangeValue>(TokenPriceHistoryRange.OneDay);
  // The point under the pointer, stored WITH the series it was snapped on, so
  // the index can never be read against a series it does not describe. A range
  // switch or a refetch makes the stored inspection inert on the very same
  // render that swaps the series in — derived, not an effect, so there is no
  // window in which a stale index picks a point out of the new series.
  const [inspected, setInspected] = useState<{
    history: ApiTokenPriceHistory;
    index: number;
  } | null>(null);
  // Whether `token_chart.brushed` has already been emitted for the activation
  // in progress. Reset on start and end, so it is exactly once per hover or
  // press.
  const brushedThisActivationRef = useRef(false);
  const { state, fetchData, warmRange, isRangeCached, startLoading } =
    useGetTokenPriceHistory();
  const isFirstFetchRef = useRef(true);
  // The last range `token_chart.range_changed` was reported for, so a range
  // passed through mid-debounce is never counted as one the user settled on.
  const settledRangeRef = useRef<TokenPriceHistoryRangeValue>(
    TokenPriceHistoryRange.OneDay,
  );
  // The (token, network) a warm pass has already been run for, so a visit
  // gets exactly one.
  const warmedScopeRef = useRef<string | null>(null);
  // Bumped when the current scope ends; a pass stops as soon as its own
  // generation is stale.
  const warmGenerationRef = useRef(0);
  // The scope whose warm pass has run to the end, every range settled.
  const [settledScope, setSettledScope] = useState<string | null>(null);
  const scope = `${networkDetails.networkPassphrase}/${token}`;

  // Unmount or token/network switch stops the queue. A generation counter, not
  // a flag: a flag reset for the new scope would let the old queue resume.
  useEffect(
    () => () => {
      warmGenerationRef.current += 1;
      // A return to this scope runs a new pass, and the sparse notices wait
      // for that one rather than any earlier one.
      warmedScopeRef.current = null;
      setSettledScope(null);
    },
    [token, networkDetails],
  );

  /**
   * Prefetches the uncached ranges, sequentially and deferred. No analytics,
   * no request state, no error reporting — but finishing the pass sets
   * `settledScope`, which releases the held sparse notices.
   */
  const warmOtherRanges = useCallback(
    async (generation: number) => {
      // The generation is captured by the caller before the fetch: this runs
      // from its `.then`, after an unmount would already have bumped it.
      if (warmGenerationRef.current !== generation) {
        return;
      }
      if (warmedScopeRef.current === scope) {
        return;
      }
      warmedScopeRef.current = scope;

      for (const range of WARM_ORDER) {
        if (warmGenerationRef.current !== generation) {
          return;
        }
        const query = { token, range, networkDetails };
        if (isRangeCached(query)) {
          continue;
        }
        // The selected range too: `warmRange` joins the user's request when it
        // is in flight, and the user's debounced fetch joins this one when it
        // is not. Stepping over it would settle the pass before that response
        // lands and moves the first-trade bound. Sequential by construction:
        // the next range starts only once this one has settled.
        await warmRange(query);
      }
      if (warmGenerationRef.current === generation) {
        setSettledScope(scope);
      }
    },
    [scope, token, networkDetails, isRangeCached, warmRange],
  );

  useEffect(() => {
    /**
     * Warming runs after this fetch and only when it produced a series: a
     * transport failure resolves `history: null` and must stop the queue.
     */
    const fetchSelectedRange = () => {
      // Snapshot the generation before the request goes out, so an unmount or
      // a token/network change while it is in flight is visible to the warm
      // pass that follows it.
      const generation = warmGenerationRef.current;
      return fetchData({ token, range: selectedRange, networkDetails }).then(
        (result) => {
          // `history` is null on transport failure — stop, or one outage becomes
          // six requests. An empty series and a cache hit are both truthy and
          // still warm.
          if (!result?.history) {
            return;
          }
          warmOtherRanges(generation);
        },
      );
    };

    // The mount fetch goes out immediately; only timeframe switches are
    // debounced (~250ms) so rapid exploratory tapping coalesces. The hook's
    // race guard discards whatever still overlaps.
    if (isFirstFetchRef.current) {
      isFirstFetchRef.current = false;
      fetchSelectedRange();
      return undefined;
    }

    // Fires on the settled range from the debounced path, matching mobile;
    // per-tap would report ranges never fetched or shown.
    const reportSettled = () => {
      if (settledRangeRef.current === selectedRange) {
        return;
      }
      settledRangeRef.current = selectedRange;
      emitMetric(METRIC_NAMES.tokenChartRangeChanged, { range: selectedRange });
    };

    // A cached range renders synchronously — debouncing a switch that issues no
    // request only adds latency. The settle report still waits out the debounce.
    const isCached = isRangeCached({
      token,
      range: selectedRange,
      networkDetails,
    });
    if (isCached) {
      fetchSelectedRange();
    } else {
      // Show the skeleton now, or the previous range's line and delta stay on
      // screen for 250ms under the newly selected tab.
      startLoading();
    }

    const timerId = setTimeout(() => {
      reportSettled();
      if (!isCached) {
        fetchSelectedRange();
      }
    }, RANGE_SWITCH_DEBOUNCE_MS);
    return () => clearTimeout(timerId);
  }, [
    token,
    selectedRange,
    networkDetails,
    fetchData,
    isRangeCached,
    startLoading,
    warmOtherRanges,
  ]);

  const handleRangeSelect = (range: TokenPriceHistoryRangeValue) => {
    if (range === selectedRange) {
      return;
    }
    setSelectedRange(range);
  };

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;
  const history: ApiTokenPriceHistory | null = state.data?.history ?? null;
  const isError = !isLoading && state.data !== null && history === null;
  const hasChart =
    !isLoading && !isError && Boolean(history && hasChartData(history.points));

  // The drawn series, or null. Everything derived below keys off this one
  // reference, so the derivations recompute when a fetch lands rather than on
  // every render of the parent detail view. Declared ahead of the delta
  // computation so the inspect derivations (which also key off it) can
  // precede it.
  const chartHistory = hasChart ? history : null;

  /**
   * One per (token, range) shown, cache hits included. Keyed off the series'
   * own range so a mid-switch render cannot mis-attribute. Deduped per visit.
   */
  const viewedRangesRef = useRef(new Set<string>());
  useEffect(() => {
    viewedRangesRef.current.clear();
  }, [token, networkDetails]);

  const viewedRange = state.data?.range;
  useEffect(() => {
    if (isLoading || !history || !viewedRange) {
      return;
    }
    if (viewedRangesRef.current.has(viewedRange)) {
      return;
    }
    viewedRangesRef.current.add(viewedRange);
    emitMetric(METRIC_NAMES.tokenChartViewed, {
      ...getChartAssetIdentity(token, networkDetails.networkPassphrase),
      // An empty series is still a view — that is the whole point of the
      // event: the user was shown the empty state, and `loaded` never says so
      // for a cached range.
      has_data: hasChartData(history.points),
      range: viewedRange,
    });
  }, [token, networkDetails, history, viewedRange, isLoading]);

  const handleInspectStart = useCallback(
    (index: number) => {
      // Not `brushed` yet: a hover that never moves, or a tap, is not a
      // sweep, and mobile's long-press-armed pan would never have activated on
      // it. The first move beyond the threshold emits the event.
      brushedThisActivationRef.current = false;
      if (chartHistory) {
        setInspected({ history: chartHistory, index });
      }
    },
    [chartHistory],
  );
  const handleInspectMove = useCallback(
    (index: number) => {
      if (!chartHistory) {
        return;
      }
      // Returning `prev` bails out of the re-render: most moves stay on one point.
      setInspected((prev) =>
        prev && prev.history === chartHistory && prev.index === index
          ? prev
          : { history: chartHistory, index },
      );
      if (!brushedThisActivationRef.current) {
        brushedThisActivationRef.current = true;
        // Once per activation, on the first move beyond the tap threshold and
        // never per move (§7.5) — the payload is the plotted series' range,
        // not `selectedRange`, which can lead it.
        emitMetric(METRIC_NAMES.tokenChartBrushed, {
          range: chartHistory.range,
        });
      }
    },
    [chartHistory],
  );
  const handleInspectEnd = useCallback(() => {
    brushedThisActivationRef.current = false;
    setInspected(null);
  }, []);

  // Also gated on `selectedRange`: the identity check alone stays true until
  // the newly selected tab's fetch effect swaps `chartHistory` in.
  const inspectedPoint =
    inspected &&
    chartHistory &&
    inspected.history === chartHistory &&
    chartHistory.range === selectedRange
      ? (chartHistory.points[inspected.index] ?? null)
      : null;
  const inspectedIndex = inspectedPoint ? (inspected?.index ?? null) : null;
  // The one client-side delta (D8 exception): close-to-close from the first
  // plotted point to the inspected one, through the same formatting path as
  // the server's `change`.
  const inspectedChange =
    chartHistory && inspectedPoint
      ? computeInspectedChange(chartHistory.points[0], inspectedPoint)
      : null;

  // Off the drawable series, not the raw response: the backend computes
  // `change` from a single point, and a signed delta above "No price data"
  // would contradict it.
  const rangeChange = hasChart && history ? history.change : null;
  // Parsed once: the direction and the dollar figure must read the same
  // number, and a second parse is a second chance for them to disagree.
  const rangeAbsolute = rangeChange
    ? new BigNumber(rangeChange.absolute)
    : null;
  const rangePercent = rangeChange
    ? formatSignedPercent(new BigNumber(rangeChange.percent), rangeAbsolute)
    : null;
  // The artwork keeps the RANGE's direction even while inspecting: a drag
  // that dips below the open must not flip the whole chart's colour, only
  // the delta text that describes the inspected point. No `change` draws
  // neutral.
  const chartDirection: PriceDirection =
    rangePercent?.colorClass ?? PriceDirection.Neutral;

  // The delta the header prints: the inspected point's close-to-close while a
  // drag is in progress, otherwise the server's `change` verbatim. Never
  // recomputed outside of the one client-side exception above.
  const displayedChange = inspectedChange ?? rangeChange;
  const changeAbsolute = displayedChange
    ? new BigNumber(displayedChange.absolute)
    : null;
  const displayedPercent = displayedChange
    ? formatSignedPercent(
        new BigNumber(displayedChange.percent),
        changeAbsolute,
      )
    : null;

  // Display `displayedChange`, never recompute it further. On error, 1D falls
  // back to the existing 24h percent (no absolute — never derived from a
  // percent); other ranges show nothing. Deliberately no copy in the empty
  // case: the design draws the row empty and mobile does the same; the
  // min-height holds it open.
  let deltaText = "";
  let deltaColorClass: RangeDeltaState["colorClass"] = PriceDirection.Neutral;
  if (isError) {
    const isOneDay = selectedRange === TokenPriceHistoryRange.OneDay;
    if (isOneDay && fallback24hPercent) {
      const fallback = formatSignedPercent(new BigNumber(fallback24hPercent));
      deltaColorClass = fallback.colorClass;
      deltaText = fallback.text;
    }
  } else if (changeAbsolute && displayedPercent) {
    deltaColorClass = displayedPercent.colorClass;
    const formattedAbsolute = formatChartPrice(changeAbsolute);
    // A sub-cent move formats to "0.00"; signing that reads as a gain the number
    // denies, so the percentage stands alone and carries the sign.
    deltaText = isFormattedZero(formattedAbsolute)
      ? displayedPercent.text
      : `${displayedPercent.sign}$${formattedAbsolute} (${displayedPercent.formatted}%)`;
  }

  // Deps are primitives, so this fires on a delta change, not on every parent
  // re-render (which would loop through the parent's setState).
  // `FETCH_DATA_START` clears `data`, so nothing stale escapes.
  // `inspectedPoint?.p` rather than `inspectedPoint`: the point object is a
  // fresh reference from `chartHistory.points`, so keying on it would fire
  // on every render while inspecting the same index.
  useEffect(() => {
    onDeltaChange({
      isLoading,
      text: deltaText,
      colorClass: deltaColorClass,
      inspectedPrice: inspectedPoint?.p ?? null,
    });
  }, [onDeltaChange, isLoading, deltaText, deltaColorClass, inspectedPoint?.p]);

  // One clock read per fetched series. Reading `Date.now()` inline in the JSX
  // handed `LineChart` a new prop value on every render and defeated its
  // memoisation; the clamp target only needs to be "now, as of this series".
  const nowSeconds = useMemo(
    () => (chartHistory ? Math.floor(Date.now() / 1000) : 0),
    [chartHistory],
  );

  // Past the cache's staleness check on purpose: a first trade never moves,
  // so an aged-out entry still bounds it.
  const priceHistoryCache = useSelector(tokenPriceHistorySelector);
  const cachedByRange =
    priceHistoryCache?.[networkDetails.networkPassphrase]?.[token];
  const firstTradeSeconds = useMemo(
    () =>
      cachedByRange && chartHistory
        ? getFirstTradeLowerBound(cachedByRange)
        : undefined,
    [cachedByRange, chartHistory],
  );

  const noticeVariant = useMemo(
    () =>
      chartHistory
        ? getNoticeVariant({
            lowVolume: chartHistory.lowVolume,
            points: chartHistory.points,
            range: chartHistory.range,
            resolutionSeconds: chartHistory.resolutionSeconds,
            nowSeconds,
            firstTradeSeconds,
            rangesSettled: settledScope === scope,
          })
        : null,
    [chartHistory, nowSeconds, firstTradeSeconds, settledScope, scope],
  );

  // Axis labels come from returned points, not the requested window (§B.5),
  // and each sits over the point it describes rather than in a fixed corner:
  // pinned right and left, the high label lands above the low point whenever
  // a series peaks early, which reads as a mislabelled chart. Mobile
  // positions them this way; this is the platform that was out of step.
  const { highLabel, lowLabel, highLabelX, lowLabelX, pointXs } =
    useMemo(() => {
      if (!chartHistory) {
        return {
          highLabel: "",
          lowLabel: "",
          highLabelX: 0,
          lowLabelX: 0,
          pointXs: [] as number[],
        };
      }
      const values = chartHistory.points.map((point) => new BigNumber(point.p));
      let minIndex = 0;
      let maxIndex = 0;
      values.forEach((value, index) => {
        if (value.lt(values[minIndex])) minIndex = index;
        if (value.gt(values[maxIndex])) maxIndex = index;
      });
      const coordinates = getChartCoordinates({
        points: chartHistory.points,
        resolutionSeconds: chartHistory.resolutionSeconds,
        nowSeconds,
      });

      return {
        highLabel: `$${formatChartPrice(values[maxIndex])}`,
        lowLabel: `$${formatChartPrice(values[minIndex])}`,
        highLabelX: coordinates[maxIndex]?.x ?? 0,
        lowLabelX: coordinates[minIndex]?.x ?? 0,
        pointXs: coordinates.map((coordinate) => coordinate.x),
      };
    }, [chartHistory, nowSeconds]);

  // `resolvedLanguage` is what i18next actually fell back to, which is the
  // language the surrounding translated string is really in — `language` can
  // still hold an unsupported request like "pt-BR".
  const language = i18n.resolvedLanguage || i18n.language;
  const labelDeltaText = rangePercent ? rangePercent.text : t("no change data");
  const chartLabel = useMemo(() => {
    if (!chartHistory) {
      return "";
    }
    // The domain `LineChart` actually plots — first and last bucket ENDS,
    // clamped to now — not the raw timestamps. On 1Y/ALL the raw end can be
    // days into the future and the raw start a bucket before the first drawn x.
    const plotted = {
      points: chartHistory.points,
      resolutionSeconds: chartHistory.resolutionSeconds,
      nowSeconds,
    };
    return t("Price chart, {{range}}: {{start}} to {{end}}, {{delta}}", {
      // The series' own range, not `selectedRange`: during a switch the tab
      // updates before the outgoing series is cleared.
      range: formatRangeLabel(chartHistory.range, t),
      start: formatPointDate(getPlottedRangeStart(plotted), language),
      end: formatPointDate(getPlottedRangeEnd(plotted), language),
      delta: labelDeltaText,
    });
  }, [chartHistory, labelDeltaText, t, language, nowSeconds]);

  const inspectedTimestamp = useMemo(() => {
    if (!chartHistory || inspectedIndex === null) {
      return "";
    }
    const { points, resolutionSeconds, range } = chartHistory;
    // The time the point is PLOTTED at, as `getChartCoordinates` places it.
    const unixSeconds =
      inspectedIndex === points.length - 1
        ? getPlottedRangeEnd({ points, resolutionSeconds, nowSeconds })
        : points[inspectedIndex].t + resolutionSeconds;
    return formatInspectedTimestamp({ unixSeconds, range, language, t });
  }, [chartHistory, inspectedIndex, nowSeconds, language, t]);

  return (
    <div className="TokenPriceChart" data-testid="TokenPriceChart">
      {/* The price labels sit in their own rows above and below the plot, not
          overlaid on it: the low label is left-aligned and a series whose
          minimum falls near the left edge ran straight into it. The rows are
          always present — empty when there is no series — so the section keeps
          its height across loading, empty, error and loaded. */}
      <div className="TokenPriceChart__plot">
        <div
          className="TokenPriceChart__axis-label TokenPriceChart__axis-label--high"
          data-testid="TokenPriceChart__axis-high"
        >
          {inspectedTimestamp && inspectedIndex !== null ? (
            <span
              className="TokenPriceChart__axis-label-text TokenPriceChart__inspect-timestamp"
              style={axisLabelPosition(pointXs[inspectedIndex] ?? 0)}
              data-testid="TokenPriceChart__inspect-timestamp"
            >
              {inspectedTimestamp}
            </span>
          ) : (
            <span
              className="TokenPriceChart__axis-label-text"
              style={axisLabelPosition(highLabelX)}
            >
              {highLabel}
            </span>
          )}
        </div>
        {/* `aria-busy` lives on the container that survives the state change —
          it flips to false in place when the series lands. The announcement
          rides the inner live region instead: a busy live region is one AT is
          told to defer, and this one unmounts the moment it stops being
          busy. */}
        <div
          className="TokenPriceChart__canvas"
          style={{ height: `${CHART_HEIGHT_PX}px` }}
          data-testid="TokenPriceChart__canvas"
          aria-busy={isLoading}
          // `tabIndex={0}`: the panel content (SVG or text) has nothing
          // focusable inside it.
          role="tabpanel"
          id={chartPanelId}
          aria-labelledby={`${chartTabIdPrefix}-${selectedRange}`}
          tabIndex={0}
        >
          {isLoading ? (
            <div
              className="TokenPriceChart__loading"
              data-testid="TokenPriceChart__loading"
              role="status"
              aria-label={t("Loading price chart")}
            >
              <ChartGhost />
            </div>
          ) : chartHistory ? (
            <>
              <LineChart
                points={chartHistory.points}
                resolutionSeconds={chartHistory.resolutionSeconds}
                nowSeconds={nowSeconds}
                direction={chartDirection}
                label={chartLabel}
                inspectedIndex={inspectedIndex}
                onInspectStart={handleInspectStart}
                onInspectMove={handleInspectMove}
                onInspectEnd={handleInspectEnd}
              />
            </>
          ) : (
            <div
              className="TokenPriceChart__placeholder"
              data-testid="TokenPriceChart__empty"
            >
              {isError
                ? t("Unable to load price data")
                : t("No price data for this period")}
            </div>
          )}
        </div>
        <div
          className="TokenPriceChart__axis-label TokenPriceChart__axis-label--low"
          data-testid="TokenPriceChart__axis-low"
        >
          <span
            className="TokenPriceChart__axis-label-text"
            style={axisLabelPosition(lowLabelX)}
          >
            {inspectedTimestamp ? "" : lowLabel}
          </span>
        </div>
      </div>
      <TimeframeSelector
        panelId={chartPanelId}
        tabIdPrefix={chartTabIdPrefix}
        selectedRange={selectedRange}
        onSelect={handleRangeSelect}
      />
      {/* The notice is inserted after the fetch settles, and it sits outside
          the `aria-busy` panel, so without a live region a screen-reader user
          resting on the selector never hears the reliability warning. The
          region is mounted unconditionally — a `role="status"` that appears in
          the same tick as its own text is announced inconsistently — and
          collapses via `:empty` so an absent notice does not open the
          section's 24px gap below the selector. */}
      <div
        className="TokenPriceChart__notice"
        data-testid="TokenPriceChart__notice"
        role="status"
      >
        {noticeVariant ? <TokenChartNotice variant={noticeVariant} /> : null}
      </div>
    </div>
  );
};
