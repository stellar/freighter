import React from "react";
import styled from "styled-components";
import { ErrorMessage, Field } from "formik";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/styles";

import ChevronIcon from "popup/assets/icon-chevron.svg";

/* Button */
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

interface ButtonProps {
  size?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export const ButtonEl = styled.button<ButtonProps>`
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
  cursor: pointer;
  -webkit-appearance: none;
`;

export const Button = ({ size, children, onClick, ...props }: ButtonProps) => (
  <ButtonEl size={size} onClick={() => onClick && onClick()} {...props}>
    {children}
  </ButtonEl>
);

/* Back Button */
interface BackButtonProps {
  onClick: () => void;
}

const BackButtonEl = styled.button`
  cursor: pointer;
  display: flex;
  align-items: center;
  background: ${COLOR_PALETTE.inputBackground};
  border: none;
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
  <BackButtonEl onClick={() => onClick && onClick()} {...props}>
    <img src={ChevronIcon} alt="chevron icon" />
  </BackButtonEl>
);

/* Form */
interface ErrorMessageProps {
  error: string;
}

export const FormErrorEl = styled.div`
  color: ${COLOR_PALETTE.error};
  font-size: 0.8125rem;
  height: 1rem;
  padding: 0.25rem 0 0.75rem;
  text-align: center;
`;

const FormCheckBoxWrapper = styled.div`
  display: inline-block;
  margin-right: 0.625rem;
`;

const FormCheckboxFieldLabel = styled.label`
  align-items: center;
  background: ${COLOR_PALETTE.inputBackground};
  border: 0.125rem solid ${COLOR_PALETTE.inputBackground};
  border-radius: 0.625rem;
  color: ${COLOR_PALETTE.primary};
  cursor: pointer;
  display: flex;
  height: 2rem;
  justify-content: space-evenly;
  width: 2rem;

  div {
    border-radius: 2rem;
    height: 1rem;
    width: 1rem;
  }
`;

const FormCheckboxFieldEl = styled(Field)`
  display: none;

  &:checked + ${FormCheckboxFieldLabel} {
    div {
      background: ${COLOR_PALETTE.primary};
    }
  }
`;

export const ApiErrorMessage = ({ error }: ErrorMessageProps) => (
  <>{error ? <FormErrorEl>{error}</FormErrorEl> : null}</>
);

export const FormButton = styled(ButtonEl)`
  &:disabled {
    color: ${COLOR_PALETTE.secondaryText};
  }
`;

interface SubmitButtonProps {
  buttonCTA: string;
  isSubmitting: boolean;
  isValid: boolean;
}

export const FormSubmitButton = ({
  buttonCTA,
  isSubmitting,
  isValid,
  ...props
}: SubmitButtonProps) => (
  <FormButton type="submit" disabled={isSubmitting || !isValid} {...props}>
    {isSubmitting ? "Loading..." : buttonCTA}
  </FormButton>
);

export const FormRow = styled.div`
  position: relative;
  padding: 0.2rem 0;
  max-width: 24.5rem;
  width: 100%;
`;

export const FormError = ({ name }: { name: string }) => (
  <FormErrorEl>
    <ErrorMessage name={name} component="span" />
  </FormErrorEl>
);

export const FormTextField = styled(Field)`
  border-radius: 1.25rem;
  border: ${(props) =>
    props.hasError ? `1px solid ${COLOR_PALETTE.error}` : 0};
  box-sizing: border-box;
  background: ${COLOR_PALETTE.inputBackground};
  font-size: 1rem;
  padding: 1.875rem 2.25rem;
  width: 100%;
`;

export const FormCheckboxField = ({ name }: { name: string }) => (
  <FormCheckBoxWrapper>
    <FormCheckboxFieldEl id={name} name={name} type="checkbox" />
    <FormCheckboxFieldLabel htmlFor={name}>
      <div />
    </FormCheckboxFieldLabel>
  </FormCheckBoxWrapper>
);

export const FormCheckboxLabel = styled.label`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 0.8125rem;
`;
