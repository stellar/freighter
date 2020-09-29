import React, { ButtonHTMLAttributes } from "react";
import styled from "styled-components";

import { HEADER_HEIGHT } from "constants/dimensions";
import {
  COLOR_PALETTE,
  FONT_WEIGHT,
  ANIMATION_TIMES,
} from "popup/constants/styles";

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
  transition: all ${ANIMATION_TIMES.fast} ease-in-out;

  &:hover {
    background: ${COLOR_PALETTE.darkPrimaryGradient};
  }

  :focus {
    box-shadow: 0 0 0 3px ${COLOR_PALETTE.primaryFaded};
  }

  :disabled {
    backgorund: ${COLOR_PALETTE.primaryMuted};
    color: rgba(255, 255, 255, 0.5);
    opacity: 0.6;
  }
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
  background: ${COLOR_PALETTE.greyFaded};
  border-radius: 0.625rem;
  justify-content: center;
  width: 2.3rem;
  height: 2.3rem;

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
