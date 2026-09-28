import BigNumber from "bignumber.js";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";

import { ApiTokenPriceHistoryPoint } from "@shared/api/types";
import { usePrefersReducedMotion } from "helpers/hooks/usePrefersReducedMotion";
import {
  CHART_MORPH_DURATION_MS,
  CHART_VERTICAL_PADDING,
  CHART_VIEWBOX_HEIGHT,
  END_DOT_RADIUS,
  CHART_VIEWBOX_WIDTH,
  INSPECT_DOT_RADIUS,
  INSPECT_DOT_RING_WIDTH,
  INSPECT_MOVE_THRESHOLD_PX,
  INSPECT_TOOLTIP_FLIP_RATIO,
  INSPECT_TOOLTIP_HEIGHT_PX,
  PriceDirection,
} from "./constants";
import { nearestCoordinateIndex } from "./inspect";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

interface LineChartProps {
  /** Rendered exactly as returned: no fabricated points, no appended spot,
   * no zero-fill, no carry-forward. Callers pass ≥2 points. */
  points: ApiTokenPriceHistoryPoint[];
  resolutionSeconds: number;
  /** Unix seconds — the clamp target for the final in-progress bucket. */
  nowSeconds: number;
  /** One class on the root colours the whole artwork via `currentColor`. */
  direction: PriceDirection;
  /** Text alternative: "Price chart, {range}: {start} to {end}, {delta}". */
  label: string;
  /** Index into `points` under the pointer, or null/undefined when idle. */
  inspectedIndex?: number | null;
  /** Tooltip text for the inspected point (formatted by the parent). */
  inspectedLabel?: string;
  onInspectStart?: (index: number) => void;
  onInspectMove?: (index: number) => void;
  onInspectEnd?: () => void;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** A plotted point in viewBox space. */
export interface ChartCoordinate {
  x: number;
  y: number;
}

const dotPath = (coord: ChartCoordinate) => `M${coord.x},${coord.y} h0.01`;

const clampProgress = (progress: number) => Math.min(Math.max(progress, 0), 1);

/** Cubic ease-out, matching mobile's `Easing.out(Easing.cubic)`. */
export const easeOutCubic = (progress: number): number => {
  const p = clampProgress(progress);
  const remaining = 1 - p;
  return 1 - remaining * remaining * remaining;
};

/** Outgoing series' y at x, linearly interpolated; clamped outside its domain. */
const sampleY = (coordinates: ChartCoordinate[], x: number): number => {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  if (x <= first.x) {
    return first.y;
  }
  if (x >= last.x) {
    return last.y;
  }
  // Strictly `<`, so an x that lands exactly on a repeated coordinate walks
  // past every duplicate and brackets against the last of them. The clock-skew
  // clamp can put two points on the same x, and the polyline paints that as a
  // vertical segment that it then carries on from at the LATER point —
  // stopping at the first duplicate would start the morph from the y the chart
  // has already drawn past, which reads as a jump on the first frame. A strict
  // comparison also makes the bracket's width provably non-zero, so there is
  // no NaN to guard against.
  for (let i = 1; i < coordinates.length; i += 1) {
    const right = coordinates[i];
    if (x < right.x) {
      const left = coordinates[i - 1];
      const span = right.x - left.x;
      return left.y + ((x - left.x) / span) * (right.y - left.y);
    }
  }
  return last.y;
};

/** One morph frame; `from` is resampled to `to`'s length so point counts may differ. */
export const interpolateChartCoordinates = ({
  from,
  to,
  progress,
}: {
  from: ChartCoordinate[];
  to: ChartCoordinate[];
  progress: number;
}): ChartCoordinate[] => {
  const p = clampProgress(progress);
  const settled = () => to.map((coord) => ({ x: coord.x, y: coord.y }));

  if (p >= 1 || from.length < 2 || to.length < 2) {
    // Never `a + (b - a) * 1`: float lerp is not exact at the endpoint, and
    // "settles exactly on the incoming geometry" is the point of the design.
    return settled();
  }

  return to.map((coord) => {
    const sourceY = sampleY(from, coord.x);
    return { x: coord.x, y: sourceY + (coord.y - sourceY) * p };
  });
};

/**
 * Where the series actually ends on the x axis: the final bucket's end, clamped
 * to `now` while that bucket is still in progress, and never before the
 * preceding point's end (a device clock behind the server would otherwise pull
 * the final point backwards, doubling the line back and self-intersecting the
 * fill).
 *
 * Exported because the chart's text alternative has to announce this same
 * value. For 1Y and ALL the raw bucket end can be days into the future, so
 * announcing it describes a domain the plot does not draw. Callers pass ≥1
 * point.
 */
/**
 * The timestamp at which the FIRST point is plotted, exactly as
 * `getChartCoordinates` places it: its bucket end, unclamped unless it is also
 * the final point. The text alternative announces this, not the raw bucket
 * start, or the spoken domain begins one bucket before the drawn one.
 */
export const getPlottedRangeStart = (input: {
  points: ApiTokenPriceHistoryPoint[];
  resolutionSeconds: number;
  nowSeconds: number;
}): number =>
  input.points.length === 1
    ? getPlottedRangeEnd(input)
    : input.points[0].t + input.resolutionSeconds;

export const getPlottedRangeEnd = ({
  points,
  resolutionSeconds,
  nowSeconds,
}: {
  points: ApiTokenPriceHistoryPoint[];
  resolutionSeconds: number;
  nowSeconds: number;
}): number => {
  const lastIndex = points.length - 1;
  const bucketEnd = points[lastIndex].t + resolutionSeconds;
  const previousBucketEnd =
    lastIndex > 0
      ? points[lastIndex - 1].t + resolutionSeconds
      : Number.NEGATIVE_INFINITY;
  return Math.max(previousBucketEnd, Math.min(bucketEnd, nowSeconds));
};

/**
 * Points plot by timestamp, not index. A bucket's close is at the bucket END,
 * so each point sits at `t + resolutionSeconds`; the in-progress final bucket
 * clamps to `now` (spot is never plotted).
 */
export const getChartCoordinates = ({
  points,
  resolutionSeconds,
  nowSeconds,
}: {
  points: ApiTokenPriceHistoryPoint[];
  resolutionSeconds: number;
  nowSeconds: number;
}): ChartCoordinate[] => {
  const timestamps = points.map((point, i) => {
    const isFinalPoint = i === points.length - 1;
    if (!isFinalPoint) {
      return point.t + resolutionSeconds;
    }
    return getPlottedRangeEnd({ points, resolutionSeconds, nowSeconds });
  });
  const minT = timestamps[0];
  const maxT = timestamps[timestamps.length - 1];
  const timeSpan = maxT - minT || 1;

  // BigNumber for the extremes, the span and the normalization; only the final
  // bounded ratio becomes a JS number. Mobile's `buildChartGeometry` does the
  // same, and the two must place the same series on the same coordinates.
  const values = points.map((point) => new BigNumber(point.p));
  let minIndex = 0;
  let maxIndex = 0;
  values.forEach((value, i) => {
    if (value.lt(values[minIndex])) minIndex = i;
    if (value.gt(values[maxIndex])) maxIndex = i;
  });
  const minValue = values[minIndex];
  const valueSpan = values[maxIndex].minus(minValue);
  const isFlat = valueSpan.isZero();

  const drawableHeight = CHART_VIEWBOX_HEIGHT - CHART_VERTICAL_PADDING * 2;

  return timestamps.map((timestamp, i) => {
    const x = ((timestamp - minT) / timeSpan) * CHART_VIEWBOX_WIDTH;
    // A flat series has no vertical information; center it.
    const y = isFlat
      ? CHART_VIEWBOX_HEIGHT / 2
      : CHART_VERTICAL_PADDING +
        (1 - values[i].minus(minValue).div(valueSpan).toNumber()) *
          drawableHeight;
    return { x: round(x), y: round(y) };
  });
};

/** Coordinates to paint now; a switch mid-morph resumes from the painted shape. */
const useMorphedCoordinates = (target: ChartCoordinate[]) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayed, setDisplayed] = useState<ChartCoordinate[]>(target);
  // What is actually painted, readable from inside a frame callback. It is
  // also how an interrupted morph resumes: the next one starts from the shape
  // on screen, never from the series it originally left.
  const displayedRef = useRef<ChartCoordinate[]>(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayedRef.current;
    // First paint, or a settled morph re-running the effect: the target IS
    // what is on screen, so there is nothing to animate.
    if (from === target) {
      return undefined;
    }

    const settle = () => {
      displayedRef.current = target;
      setDisplayed(target);
    };

    // Fewer than two points on either side is no line at all, and a user who
    // asked for reduced motion gets the hard switch — which is the correct
    // behaviour for them, not a degraded one.
    if (prefersReducedMotion || from.length < 2 || target.length < 2) {
      settle();
      return undefined;
    }

    let startedAt: number | null = null;
    const step = (timestamp: number) => {
      if (startedAt === null) {
        startedAt = timestamp;
      }
      const progress = (timestamp - startedAt) / CHART_MORPH_DURATION_MS;
      if (progress >= 1) {
        frameRef.current = null;
        settle();
        return;
      }
      const frame = interpolateChartCoordinates({
        from,
        to: target,
        progress: easeOutCubic(progress),
      });
      displayedRef.current = frame;
      setDisplayed(frame);
      frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);
    // Cancels on unmount and, because `target` is a dependency, whenever a new
    // morph starts — only one frame is ever outstanding.
    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [target, prefersReducedMotion]);

  return displayed;
};

/** Pointer position → viewBox x. The svg is stretched to the popup width. */
const toViewBoxX = (event: React.PointerEvent<SVGSVGElement>): number => {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width === 0) {
    return 0;
  }
  return ((event.clientX - rect.left) / rect.width) * CHART_VIEWBOX_WIDTH;
};

/** Centred on the inspected dot and clamped inside the plot band so the pill never overhangs the label rows. */
export const inspectTooltipTop = (y: number): number =>
  Math.min(
    Math.max(y - INSPECT_TOOLTIP_HEIGHT_PX / 2, 0),
    CHART_VIEWBOX_HEIGHT - INSPECT_TOOLTIP_HEIGHT_PX,
  );

/**
 * Memoised on props: the parent re-renders on unrelated state (price polls,
 * menu), and the per-move inspect props are the only ones that churn.
 *
 * Drag-to-inspect is pointer-only (§7.4): pointerdown arms, capture keeps
 * moves flowing, up/cancel clears. Keyboard users keep everything shown by
 * default — chart, per-range delta, label — and lose arbitrary-point
 * inspection specifically; focusable guide as a follow-up.
 */
export const LineChart = React.memo(function LineChart({
  points,
  resolutionSeconds,
  nowSeconds,
  direction,
  label,
  inspectedIndex,
  inspectedLabel,
  onInspectStart,
  onInspectMove,
  onInspectEnd,
}: LineChartProps) {
  // Memoised on the series itself, so the morph effect fires on a real change
  // of geometry rather than on every render.
  const targetCoordinates = useMemo(
    () => getChartCoordinates({ points, resolutionSeconds, nowSeconds }),
    [points, resolutionSeconds, nowSeconds],
  );
  const coordinates = useMorphedCoordinates(targetCoordinates);

  const xs = useMemo(
    () => targetCoordinates.map((c) => c.x),
    [targetCoordinates],
  );
  const isInspecting = inspectedIndex !== null && inspectedIndex !== undefined;
  // The dot rides the DISPLAYED (possibly morphing) geometry; the snap uses
  // the target geometry, whose indices are the points' indices.
  const inspectedCoord = isInspecting ? coordinates[inspectedIndex] : undefined;

  // The pointer id that armed the inspection; null while idle. Any other
  // pointer is ignored so a second finger cannot restart or hijack the drag.
  const activePointerIdRef = useRef<number | null>(null);
  const downClientXRef = useRef(0);
  const hasCrossedMoveThresholdRef = useRef(false);
  const onInspectEndRef = useRef(onInspectEnd);
  onInspectEndRef.current = onInspectEnd;

  // An unmount mid-drag (the skeleton replacing the chart) fires no pointerup,
  // so the parent would otherwise keep the inspection it was never told ended.
  useEffect(
    () => () => {
      if (activePointerIdRef.current !== null) {
        activePointerIdRef.current = null;
        onInspectEndRef.current?.();
      }
    },
    [],
  );

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // A right/middle press opens a menu or autoscrolls; it must not arm or
    // take the lock, or no pointerup may ever release it.
    if (!event.isPrimary || event.button !== 0) {
      return;
    }
    if (!onInspectStart || xs.length < 2) {
      return;
    }
    // A second pointer while one is already inspecting is ignored outright:
    // restarting the activation would emit a second `brushed` and hand the
    // drag to a finger that never armed it.
    if (activePointerIdRef.current !== null) {
      return;
    }
    activePointerIdRef.current = event.pointerId;
    downClientXRef.current = event.clientX;
    hasCrossedMoveThresholdRef.current = false;
    // Keep receiving moves after the pointer leaves the svg; jsdom lacks it.
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    onInspectStart(nearestCoordinateIndex(xs, toViewBoxX(event)));
  };
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    // Idle (no pointer down) or a pointer that is not the active one: ignored.
    if (activePointerIdRef.current !== event.pointerId || !onInspectMove) {
      return;
    }
    if (!hasCrossedMoveThresholdRef.current) {
      if (
        Math.abs(event.clientX - downClientXRef.current) <
        INSPECT_MOVE_THRESHOLD_PX
      ) {
        return;
      }
      hasCrossedMoveThresholdRef.current = true;
    }
    onInspectMove(nearestCoordinateIndex(xs, toViewBoxX(event)));
  };
  /**
   * End of the activation: `pointerup`, `pointercancel` (the browser claimed
   * the gesture as a scroll) and `lostpointercapture` (capture taken away by
   * anything else) all land here, and clearing is idempotent so overlapping
   * ones cost nothing. A pointer OTHER than the active one cannot end someone
   * else's drag; an end with no pointer tracked still clears, so a state the
   * component never armed can always be released.
   */
  const handlePointerEnd = (event: React.PointerEvent<SVGSVGElement>) => {
    if (
      activePointerIdRef.current !== null &&
      activePointerIdRef.current !== event.pointerId
    ) {
      return;
    }
    activePointerIdRef.current = null;
    onInspectEnd?.();
  };

  const tooltipPlacement =
    inspectedCoord &&
    inspectedCoord.x / CHART_VIEWBOX_WIDTH < INSPECT_TOOLTIP_FLIP_RATIO
      ? "right"
      : "left";

  const linePoints = coordinates
    .map((coord) => `${coord.x},${coord.y}`)
    .join(" ");
  const endPoint = coordinates[coordinates.length - 1];
  // Close the area under the REAL endpoints, not the viewBox edges: the
  // clock-skew clamp can collapse a two-point series onto one x, and a fill
  // closed at x=320 would then draw a diagonal unrelated to the data.
  const fillPoints = `${linePoints} ${endPoint.x},${CHART_VIEWBOX_HEIGHT} ${coordinates[0].x},${CHART_VIEWBOX_HEIGHT}`;
  // Per instance: SVG ids are document-global, and two charts overlapping
  // during a sheet transition would both resolve `url(#…)` to the first.
  const gradientId = `${useId()}-gradient`;

  return (
    <>
      <svg
        className={`LineChart LineChart--${direction}${onInspectStart ? " LineChart--inspectable" : ""}`}
        viewBox={`0 0 ${CHART_VIEWBOX_WIDTH} ${CHART_VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        // Every series ends at x=320 and the end dot extends 3 units past it;
        // the UA default (`overflow: hidden` on inline svg) would halve the dot.
        overflow="visible"
        role="img"
        aria-label={label}
        data-testid="TokenPriceChart__svg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={fillPoints}
          fill={`url(#${gradientId})`}
          stroke="none"
          data-testid="TokenPriceChart__fill"
        />
        <polyline
          data-testid="TokenPriceChart__polyline"
          points={linePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* The dot is a (near) zero-length stroke with round caps under
          `non-scaling-stroke`: the stroke outline is built in screen space,
          so it stays a circle however the outer svg is stretched. A nested
          viewport would not — its aspect handling runs in the already
          stretched user space. */}
        {inspectedCoord ? (
          <>
            <line
              x1={inspectedCoord.x}
              x2={inspectedCoord.x}
              y1={0}
              y2={CHART_VIEWBOX_HEIGHT}
              className="LineChart__guide"
              strokeDasharray="4 4"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              data-testid="TokenPriceChart__inspect-guide"
            />
            {/* Ring first (background colour), dot on top — both zero-length
              round-capped strokes, as the end dot is. */}
            <path
              d={dotPath(inspectedCoord)}
              fill="none"
              className="LineChart__inspect-ring"
              strokeWidth={(INSPECT_DOT_RADIUS + INSPECT_DOT_RING_WIDTH) * 2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={dotPath(inspectedCoord)}
              fill="none"
              stroke="currentColor"
              strokeWidth={INSPECT_DOT_RADIUS * 2}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              data-testid="TokenPriceChart__inspect-dot"
            />
          </>
        ) : (
          <path
            d={dotPath(endPoint)}
            fill="none"
            stroke="currentColor"
            strokeWidth={END_DOT_RADIUS * 2}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            data-testid="TokenPriceChart__end-dot"
          />
        )}
      </svg>
      {inspectedCoord && inspectedLabel ? (
        <div
          className={`LineChart__tooltip LineChart__tooltip--${tooltipPlacement}`}
          style={{
            left: `${(inspectedCoord.x / CHART_VIEWBOX_WIDTH) * 100}%`,
            top: `${inspectTooltipTop(inspectedCoord.y)}px`,
          }}
          aria-hidden="true"
          data-testid="TokenPriceChart__inspect-tooltip"
        >
          {inspectedLabel}
        </div>
      ) : null}
    </>
  );
});
