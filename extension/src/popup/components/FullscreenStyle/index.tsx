import { useEffect } from "react";

import "./styles.scss";

const fullscreenClassname = "Fullscreen";

export const FullscreenStyle = () => {
  useEffect(() => {
    const bodyHtmlSelector = document.querySelectorAll("body, html");

    if (bodyHtmlSelector) {
      bodyHtmlSelector.forEach((el) => el.classList.add(fullscreenClassname));
    }

    return () => document.body.classList.remove(fullscreenClassname);
  }, []);

  return null;
};
