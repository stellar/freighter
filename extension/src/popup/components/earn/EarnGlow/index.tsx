import React from "react";

import "./styles.scss";

/**
 * The blurred green disc behind the Earn screens' Blend mark.
 *
 * Drawn in CSS rather than as the exported SVG it replaces so its colour can
 * follow the theme: the asset baked the dark frame's green, which on the light
 * page rendered as a grey smudge. The falloff is unchanged — `filter: blur()`
 * takes the Gaussian's standard deviation, the same 100px the asset's
 * `feGaussianBlur` used.
 *
 * Hosts place it (absolutely, centred with a translate) and set any opacity;
 * the disc itself only knows its size and colour.
 */
export const EarnGlow = ({ className }: { className: string }) => (
  <div className={`EarnGlow ${className}`} aria-hidden="true" />
);
