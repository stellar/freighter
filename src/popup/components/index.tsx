import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/styles";
import { Button } from "popup/basics";

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

export const FormButton = styled(Button)`
  background: ${COLOR_PALETTE.primaryGradient};
  border-radius: 1.5rem;
  color: #fff;
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3rem;
  margin: 2rem auto;
  padding: 1.6rem 6rem;
`;
