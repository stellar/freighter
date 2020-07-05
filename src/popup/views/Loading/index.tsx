import React from "react";
import styled from "styled-components";

const LoadingEl = styled.div`
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
`;

export const Loading = () => (
  <LoadingEl>
    <p>Loading...</p>
  </LoadingEl>
);
