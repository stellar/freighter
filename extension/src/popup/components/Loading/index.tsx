import React from "react";
import { Loader } from "@stellar/design-system";

import "./styles.scss";

export const Loading = () => (
  <div className="Loading">
    <div className="Loading__wrapper">
      <Loader size="5rem" />
    </div>
  </div>
);
