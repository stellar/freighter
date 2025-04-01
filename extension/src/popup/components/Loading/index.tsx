import React from "react";
import { Loader } from "@stellar/design-system";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const Loading = () => (
  <View.Content>
    <div className="Loading" data-testid="Loading">
      <Loader size="5rem" />
    </div>
  </View.Content>
);
