import { truncateString } from "helpers/stellar";
import React, { useEffect, useState, RefObject } from "react";

import "./styles.scss";

function getStringWidth(value: string, font = "16px Inter, sans-serif") {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  context.font = font;
  const metrics = context.measureText(value);
  return Math.ceil(metrics.width);
}

export const TruncateMiddle = ({
  parentRef,
  value,
  font,
}: {
  parentRef: RefObject<Element>;
  value: string;
  font?: string;
}) => {
  //  the difference between the parent elements width, and out strings width
  const [widthPercentage, setWidthPercentage] = useState(0);
  useEffect(() => {
    const resizeObserver = new ResizeObserver((event) => {
      const parentWidth = event[0].contentBoxSize[0].inlineSize;
      const valueWidth = getStringWidth(value, font);
      setWidthPercentage((parentWidth / valueWidth) * 100);
    });

    if (parentRef && parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }
  }, [parentRef, value, font]);

  if (!widthPercentage) {
    return <></>;
  }

  // fits in parent element
  if (widthPercentage > 100) {
    return <span className="TruncatedMiddle">{value}</span>;
  }

  const truncationAmount = (value.length * widthPercentage) / 100 - 5; // pad it a bit
  return (
    <span className="TruncatedMiddle">
      {truncateString(value, Math.abs(truncationAmount) / 2)}
    </span>
  );
};
