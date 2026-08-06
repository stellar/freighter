import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";
import { Icon } from "@stellar/design-system";

import "./styles.scss";

/*
  Toast component from sonner (https://sonner.emilkowal.ski/)
  Used for displaying toast notifications in the application.
*/

// Clears the header controls (~56px at the tallest) so a toast can't cover
// them. Set on both props: below sonner's 600px breakpoint only `mobileOffset`
// applies, above it only `offset` (fullscreen mode).
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
