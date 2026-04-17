import { KeyboardEvent } from "react";

export const activateOnEnterOrSpace =
  (onActivate: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };
