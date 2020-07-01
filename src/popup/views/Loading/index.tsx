import React from "react";
import styled from "styled-components";

import { FullscreenStyle } from "popup/components/Layout/Fullscreen/basics/FullscreenStyle";

const LoadingEl = styled.div`
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
`;

export const Loading = () => (
  <LoadingEl>
    <FullscreenStyle />
    <p>Loading...</p>
  </LoadingEl>
);
