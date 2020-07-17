import React, { useEffect } from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/constants/styles";

const TOAST_LENGTH = 1000;

interface ToastWrapperProps {
  isShowing: boolean;
}

const ToastWrapper = styled.div`
  background: #fff;
  border-radius: 0.9rem;
  color: ${COLOR_PALETTE.primary};
  visibility: ${({ isShowing }: ToastWrapperProps) =>
    isShowing ? "visible" : "hidden"};
  font-weight: 600;
  margin-top: ${({ isShowing }: ToastWrapperProps) =>
    isShowing ? "-1rem" : "0"};
  opacity: ${({ isShowing }: ToastWrapperProps) => (isShowing ? "1.0" : "0")};
  padding: 1.125rem;
  position: absolute;
  transition: all 0.25s ease-in-out;
  white-space: nowrap;
`;

interface ToastProps {
  className?: string;
  message: string;
  isShowing: boolean;
  setIsShowing: (isShowing: boolean) => void;
}

export const Toast = ({
  className,
  message,
  isShowing,
  setIsShowing,
}: ToastProps) => {
  useEffect(() => {
    if (isShowing) {
      setTimeout(() => {
        setIsShowing(false);
      }, TOAST_LENGTH);
    }
  }, [isShowing, setIsShowing]);
  return (
    <ToastWrapper isShowing={isShowing} className={className}>
      {message}
    </ToastWrapper>
  );
};
