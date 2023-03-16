import React from "react";

// https://egghead.io/lessons/react-preserve-cursor-position-when-filtering-out-characters-from-a-react-input
// Schedule an arbitrary fn to run after update, the closure over afterPaintRef shared between useLayoutEffect
// and runAfterUpdate keeps them synced
export function useRunAfterUpdate() {
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
}
