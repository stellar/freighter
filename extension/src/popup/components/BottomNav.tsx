import React from "react";
// import styled from "styled-components";

import { Icon } from "@stellar/design-system";

export const BottomNav = () => {
  // ALEC TODO - remove
  console.log("bottom nav load");
  return (
    <div>
      {/* TODO - use wallet when added to SDS */}
      <Icon.CreditCard />
      <Icon.Clock />
      <Icon.RefreshCw />
      <Icon.Settings />
    </div>
  );
};
