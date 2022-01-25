import React from "react";
import styled from "styled-components";

import { SubmitButton as BasicSubmitButton } from "../Forms";

import "./styles.scss";

export const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-around;
  padding-top: 3rem;
  padding-bottom: 1.5rem;
`;

export const SubmitButton = styled(BasicSubmitButton)`
  width: 12.43rem;
`;

interface ModalWrapperProps {
  children: React.ReactNode;
}

export const ModalWrapper = ({ children }: ModalWrapperProps) => (
  <section className="ModalWrapper">{children}</section>
);
