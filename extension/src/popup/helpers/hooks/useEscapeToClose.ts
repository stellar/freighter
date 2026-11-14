import { useEffect, useRef } from "react";

/**
 * Esc closes the calling screen (runs `onClose`) instead of the whole popup.
 * Chrome closes an extension popup on an Esc the page leaves unhandled, so
 * this marks the key handled. An Esc something else already handled, like an
 * open sheet, is left to it.
 */
export const useEscapeToClose = (onClose: () => void) => {
  // The latest callback, without re-subscribing on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);
};
