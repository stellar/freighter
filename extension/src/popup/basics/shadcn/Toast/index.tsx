import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";
import { Icon } from "@stellar/design-system";

import "./styles.scss";

/*
  Toast component from sonner (https://sonner.emilkowal.ski/)
  Used for displaying toast notifications in the application.
*/

// The popup is 360px wide, which is within sonner's `@media (max-width:
// 600px)` breakpoint. At that width sonner switches the toaster container to
// `position: fixed; width: 100%` and reads its position from `mobileOffset`
// rather than `offset` - so `offset` alone has no effect at popup width.
// `top: "64px"` clears both the Home top icon row (buttons bottom out at
// ~56px) and the Account details back button (bottom ~52px) with a few px
// of breathing room. `offset` is set to the same top value so the toaster
// still sits below the header if this UI is ever rendered wider than 600px
// (e.g. fullscreen mode via openTab, where the mobile media query doesn't
// apply). Omitting left/right/bottom is intentional: sonner falls back to
// its own per-mode defaults (16px mobile / 24px desktop) rather than 0.
const TOAST_TOP_OFFSET = "64px";

function Toaster({ ...props }: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      data-testid="shadcn-toast"
      className="Toast"
      theme="dark"
      position="top-center"
      offset={{ top: TOAST_TOP_OFFSET }}
      mobileOffset={{ top: TOAST_TOP_OFFSET }}
      icons={{
        info: <Icon.InfoCircle />,
      }}
      {...props}
    />
  );
}

export { Toaster };
