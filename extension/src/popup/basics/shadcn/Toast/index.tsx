import * as React from "react";
import { Toaster as SonnerToaster, toast } from "sonner";
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

/**
 * Shows a custom toast, replacing any toast already on screen, so toasts
 * never stack. Each call gets a fresh id; a stable id can stop the toast
 * from rendering once an earlier one with that id has been dismissed.
 */
const showToast = (render: (id: string | number) => React.ReactElement) => {
  toast.dismiss();
  return toast.custom(render);
};

export { Toaster, showToast };
