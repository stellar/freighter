import React, { ButtonHTMLAttributes } from "react";
import styled from "styled-components";

import { HEADER_HEIGHT } from "popup/constants/dimensions";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import ChevronIcon from "popup/assets/icon-chevron.svg";

export const BasicButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  -webkit-appearance: none;

  :focus {
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: string;
  onClick: () => void;
  children: React.ReactNode;
}

const ButtonEl = styled(BasicButton)<ButtonProps>`
  width: ${(props) => (props.size === "small" ? "8.75rem" : "12.375rem")};
  display: ${(props) => (props.size === "small" ? "inline-block" : "block")};
  margin: 0 auto;
  font-size: 0.8rem;
  font-weight: ${FONT_WEIGHT.bold};
  padding: 1.45rem;
  border-radius: 1.25rem;
  background: ${COLOR_PALETTE.primaryGradient};
  color: ${COLOR_PALETTE.white};
  border: none;
  -webkit-appearance: none;
`;

export const Button = ({ size, children, onClick, ...props }: ButtonProps) => (
  <ButtonEl {...props} size={size} onClick={onClick}>
    {children}
  </ButtonEl>
);

/* Back Button */
interface BackButtonProps {
  onClick: () => void;
}

const BackButtonEl = styled(BasicButton)`
  position: absolute;
  top: calc(${HEADER_HEIGHT}px + 1rem);
  left: 1rem;
  display: flex;
  align-items: center;
  background: ${COLOR_PALETTE.inputBackground};
  border-radius: 0.625rem;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;

  img {
    transform: rotate(180deg);
    width: 0.8rem;
    height: 0.8rem;
  }
`;

export const BackButton = ({ onClick, ...props }: BackButtonProps) => (
  <BackButtonEl onClick={onClick} {...props}>
    <img src={ChevronIcon} alt="chevron icon" />
  </BackButtonEl>
);
