import React from "react";
import styled from "styled-components";
import { Form as FormikForm, ErrorMessage, Field } from "formik";

import { COLOR_PALETTE } from "popup/constants/styles";
import { Button } from "popup/basics/Buttons";

interface FormProps {
  children: React.ReactNode;
  className?: string;
}

const StyledFormEl = styled(FormikForm)`
  display: flex;
  flex-flow: column wrap;
`;

export const Form = ({ children, className }: FormProps) => (
  <StyledFormEl className={className}>{children}</StyledFormEl>
);

const FormButtonEl = styled(Button)`
  &:disabled {
    color: ${COLOR_PALETTE.secondaryText};
  }
`;

interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isSubmitting?: boolean;
  isValid?: boolean;
  size?: string;
  onClick?: () => void;
}

export const SubmitButton = ({
  children,
  isSubmitting = false,
  isValid = true,
  onClick = () => {},
  size,
  ...props
}: SubmitButtonProps) => (
  <FormButtonEl
    {...props}
    onClick={onClick}
    size={size}
    type="submit"
    disabled={isSubmitting || !isValid}
  >
    {isSubmitting ? "Loading..." : children}
  </FormButtonEl>
);

/* Form */
interface ErrorMessageProps {
  error: React.ReactNode;
}

const FormErrorEl = styled.div`
  color: ${COLOR_PALETTE.error};
  font-size: 0.8125rem;
  height: 1rem;
  padding: 0.25rem 0 0.75rem;
  text-align: center;
  line-height: 1;
`;

export const ApiErrorMessage = ({ error }: ErrorMessageProps) =>
  error ? <FormErrorEl>{error}</FormErrorEl> : null;

export const FormRow = styled.div`
  position: relative;
  padding: 0.2rem 0;
  max-width: 24.5rem;
  width: 100%;
`;

export const Error = ({ name }: { name: string }) => (
  <FormErrorEl>
    <ErrorMessage name={name} component="span" />
  </FormErrorEl>
);

export const Label = styled.label`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 0.8125rem;
`;

export const TextField = styled(Field)`
  border-radius: 1.25rem;
  border: ${(props) => (props.error ? `1px solid ${COLOR_PALETTE.error}` : 0)};
  box-sizing: border-box;
  background: ${COLOR_PALETTE.inputBackground};
  font-size: 1rem;
  padding: 1.875rem 2.25rem;
  width: 100%;
  resize: none;

  &::-webkit-input-placeholder {
    font-family: "Muli", sans-serif;
  }

  &:-ms-input-placeholder {
    font-family: "Muli", sans-serif;
  }

  &:-moz-placeholder {
    font-family: "Muli", sans-serif;
  }

  &::-moz-placeholder {
    font-family: "Muli", sans-serif;
  }
`;

const CheckBoxWrapperEl = styled(Label)`
  display: flex;
  align-items: center;
`;

const CheckboxFieldEl = styled(Field).attrs(() => ({ type: "checkbox" }))`
  position: relative;
  margin-right: 0.625rem;
  appearance: unset;
  align-items: center;
  background: ${COLOR_PALETTE.inputBackground};
  border: 0.125rem solid ${COLOR_PALETTE.inputBackground};
  border-radius: 0.625rem;
  color: ${COLOR_PALETTE.primary};
  cursor: pointer;
  height: 2rem;
  width: 2rem;

  &:checked:after {
    content: "";
    background: ${COLOR_PALETTE.primary};
    border-radius: 2rem;
    position: absolute;
    top: 0;
    left: 0;
    height: 1rem;
    width: 1rem;
    margin: 0.375rem;
  }
`;

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const CheckboxField = ({
  name,
  label,
  children,
  className,
  ...props
}: CheckboxProps) => (
  <CheckBoxWrapperEl className={className}>
    <CheckboxFieldEl {...props} id={name} name={name} />
    {label}
  </CheckBoxWrapperEl>
);
