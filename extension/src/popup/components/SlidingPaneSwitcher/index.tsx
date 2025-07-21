import React, { useRef, useEffect, useState } from "react";

import "./styles.scss";

interface MultiPaneSliderProps {
  panes: React.ReactNode[];
  activeIndex: number;
}

export const MultiPaneSlider = ({
  panes,
  activeIndex,
}: MultiPaneSliderProps) => {
  const prevIndex = useRef(activeIndex);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    setDirection(activeIndex > prevIndex.current ? "forward" : "backward");
    prevIndex.current = activeIndex;
  }, [activeIndex]);

  return (
    <div className="multi-pane-slider">
      <div
        className={`multi-pane-slider__track multi-pane-slider__track--${direction}`}
        style={{
          transform: `translateX(-${activeIndex * 100}%)`,
        }}
      >
        {panes.map((pane, i) => (
          <div className="multi-pane-slider__pane" key={i}>
            {pane}
          </div>
        ))}
      </div>
    </div>
  );
};
