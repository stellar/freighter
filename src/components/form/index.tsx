import React from "react";
import styled from "styled-components";

const ErrorEl = styled.p`
  color: red;
  font-weight: bold;
`;

interface ErrorMessageProps {
  authError: string;
}

export const ErrorMessage = ({ authError }: ErrorMessageProps) => (
  <>{authError ? <ErrorEl>{authError}</ErrorEl> : null}</>
);
