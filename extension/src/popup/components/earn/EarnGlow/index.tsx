import React from "react";

import "./styles.scss";

/**
 * The blurred green disc behind the Earn intro's Blend mark.
 *
 * Drawn in CSS rather than as the exported SVG so it stays a single element the
 * host can place and clip. `filter: blur()` takes the Gaussian's standard
 * deviation, the same 100px the asset's `feGaussianBlur` used.
 *
 * Hosts place it (absolutely, centred with a translate); the disc itself only
 * knows its size and colour.
 */
export const EarnGlow = ({ className }: { className: string }) => (
  <div className={`EarnGlow ${className}`} aria-hidden="true" />
);
