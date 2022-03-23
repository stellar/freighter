import React from "react";

import "./styles.scss";

export const AppError = ({ children }: { children: React.ReactNode }) => (
  <div className="AppError">
    <div>
      <h1>An error occurred</h1>
      <p>{children}</p>
    </div>
  </div>
);
