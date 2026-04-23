import * as React from "react";
import { Toaster as SonnerToaster } from "sonner";
import { Icon } from "@stellar/design-system";

import "./styles.scss";

/*
  Toast component from sonner (https://sonner.emilkowal.ski/)
  Used for displaying toast notifications in the application.
*/

function Toaster({ ...props }: React.ComponentProps<typeof SonnerToaster>) {
  return (
    <SonnerToaster
      data-testid="shadcn-toast"
      className="Toast"
      theme="dark"
      position="top-center"
      icons={{
        info: <Icon.InfoCircle />,
      }}
      {...props}
    />
  );
}

export { Toaster };
