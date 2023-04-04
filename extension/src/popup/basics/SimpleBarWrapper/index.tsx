import React from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

export const SimpleBarWrapper = ({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <SimpleBar className={`SimpleBarWrapper ${className}`} {...props}>
    {children}
  </SimpleBar>
);
