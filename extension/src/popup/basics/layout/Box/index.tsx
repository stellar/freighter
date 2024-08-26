import React from "react";
import { addStyleClasses } from "popup/helpers/addStyleClasses";

import "./styles.scss";

interface BoxProps {
  display?: "grid" | "flex";
  children: React.ReactElement | React.ReactElement[];
  gridCellWidth?: string;
  gapHorizontal?: string;
  gapVertical?: string;
  isFlexRow?: boolean;
}

export const Box: React.FC<BoxProps> = ({
  display = "grid",
  children,
  gridCellWidth,
  gapHorizontal,
  gapVertical,
  isFlexRow,
  ...props
}: BoxProps) => {
  const customStyle = {
    // eslint-disable-next-line
    ...(gridCellWidth ? { "--Box-grid-cell-width": gridCellWidth } : {}),
    // eslint-disable-next-line
    ...(gapHorizontal ? { "--Box-gap-horizontal": gapHorizontal } : {}),
    // eslint-disable-next-line
    ...(gapVertical ? { "--Box-gap-vertical": gapVertical } : {}),
    ...(display === "grid"
      ? {
          // eslint-disable-next-line
          "grid-template-columns": `repeat(auto-fit, ${
            gridCellWidth || "100%"
          })`,
        }
      : {}),
  } as React.CSSProperties;

  return (
    <div
      className={`Box ${addStyleClasses([
        display === "grid" ? "Box--grid" : "Box--flex",
        isFlexRow ? "Box--flex--row" : "",
      ])}`}
      style={customStyle}
      {...props}
    >
      {children}
    </div>
  );
};
