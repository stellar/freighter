import React from "react";
import styled from "styled-components";

const El = styled.div`
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
`;

export const AppError = ({ children }: { children: React.ReactNode }) => (
  <El>
    <div>
      <h1>An error occurred</h1>
      <p>{children}</p>
    </div>
  </El>
);
