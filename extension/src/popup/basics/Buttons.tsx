import React, { ButtonHTMLAttributes } from "react";
import styled from "styled-components";

import { HEADER_HEIGHT } from "constants/dimensions";
import {
  COLOR_PALETTE,
  FONT_FAMILY,
  FONT_WEIGHT,
  ANIMATION_TIMES,
  ROUNDED_CORNERS,
} from "popup/constants/styles";

import { Icon } from "@stellar/design-system";

export const BasicButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-family: ${FONT_FAMILY};
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
  border-radius: ${ROUNDED_CORNERS};
  background: ${COLOR_PALETTE.primaryGradient};
  color: ${COLOR_PALETTE.white};
  border: none;
  -webkit-appearance: none;
  transition: all ${ANIMATION_TIMES.fast} ease-in-out;
  white-space: nowrap;

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
  isPopup?: boolean;
}

const BackButtonEl = styled(BasicButton)<BackButtonProps>`
  position: absolute;
  top: ${(props) => (props.isPopup ? 0 : `calc(${HEADER_HEIGHT}px + 1rem)`)};
  left: 1rem;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 5rem;
  height: 2.3rem;
  font-size: 0.875rem;
  line-height: 1.5rem;
  font-weight: var(--font-weight-medium);

  svg {
    width: 1rem;
  }
`;

export const BackButton = ({
  onClick,
  isPopup = false,
  ...props
}: BackButtonProps) => (
  <BackButtonEl onClick={onClick} isPopup={isPopup} {...props}>
    <Icon.ArrowLeft /> {!isPopup && "BACK"}
  </BackButtonEl>
);
