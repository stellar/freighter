import React, { useEffect, useState } from "react";
import "./styles.scss";

interface MultiPaneSliderProps {
  panes: React.ReactNode[];
  activeIndex: number;
}

export const MultiPaneSlider = ({
  panes,
  activeIndex,
}: MultiPaneSliderProps) => {
  const [displayedIndex, setDisplayedIndex] = useState(activeIndex);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    if (activeIndex === displayedIndex) return;

    setDirection(activeIndex > displayedIndex ? "forward" : "backward");
    setTransitioning(true);

    const timeout = setTimeout(() => {
      setDisplayedIndex(activeIndex);
      setTransitioning(false);
    }, 300); // same as animation duration

    return () => clearTimeout(timeout);
  }, [activeIndex, displayedIndex]);

  return (
    <div className="multi-pane-slider">
      <div className="multi-pane-slider__container">
        <div
          key={displayedIndex}
          className={`multi-pane-slider__pane ${
            transitioning
              ? direction === "forward"
                ? "slide-out-left"
                : "slide-out-right"
              : ""
          }`}
        >
          {panes[displayedIndex]}
        </div>
        {transitioning && (
          <div
            key={activeIndex}
            className={`multi-pane-slider__pane ${
              direction === "forward" ? "slide-in-right" : "slide-in-left"
            }`}
          >
            {panes[activeIndex]}
          </div>
        )}
      </div>
    </div>
  );
};
