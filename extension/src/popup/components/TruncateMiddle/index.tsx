import { truncateString } from "helpers/stellar";
import React, { useEffect, useState, RefObject } from "react";

function getStringWidth(value: string, font = "16px Inter, sans-serif") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const metrics = context.measureText(value);
  return metrics.width;
}

export const TruncateMiddle = ({
  parentRef,
  value,
}: {
  parentRef: RefObject<Element>;
  value: string;
}) => {
  //  the difference between the parent elements width, and out strings width
  const [widthDifference, setWidthDifference] = useState(0);
  useEffect(() => {
    const resizeObserver = new ResizeObserver((event) => {
      const parentWidth = event[0].contentBoxSize[0].inlineSize;
      const valueWidth = getStringWidth(value);
      console.log(parentWidth, valueWidth);
      setWidthDifference(parentWidth - valueWidth);
    });

    if (parentRef && parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }
  }, [parentRef, value]);

  if (!widthDifference) return <></>;

  // fits in parent element
  if (Math.sign(widthDifference) === 1) {
    return <span className="TruncatedMiddle">{value}</span>;
  }

  return (
    <span className="TruncatedMiddle">
      {truncateString(value, widthDifference / 2)}
    </span>
  );
};
