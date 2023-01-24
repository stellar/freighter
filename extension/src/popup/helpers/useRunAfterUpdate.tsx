import React from "react";

export const useRunAfterUpdate = () => {
  const afterPaintRef = React.useRef<any>(null);
  React.useLayoutEffect(() => {
    if (afterPaintRef.current) {
      afterPaintRef.current();
      afterPaintRef.current = null;
    }
  });
  const runAfterUpdate = (fn: () => unknown) => {
    afterPaintRef.current = fn;
    return null;
  };
  return runAfterUpdate;
};
