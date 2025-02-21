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
    ...(gridCellWidth ? { "--Box-grid-cell-width": gridCellWidth } : {}),

    ...(gapHorizontal ? { "--Box-gap-horizontal": gapHorizontal } : {}),

    ...(gapVertical ? { "--Box-gap-vertical": gapVertical } : {}),
    ...(display === "grid"
      ? {
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
