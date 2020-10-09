import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Form as FormikForm, ErrorMessage, Field } from "formik";

import {
  COLOR_PALETTE,
  ANIMATION_TIMES,
  ROUNDED_CORNERS,
} from "popup/constants/styles";
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

interface SubmitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  dirty?: boolean;
  isSubmitting?: boolean;
  isValid?: boolean;
  size?: string;
  onClick?: () => void;
}

export const SubmitButton = ({
  children,
  dirty = true,
  isSubmitting = false,
  isValid = true,
  onClick = () => {},
  size,
  ...props
}: SubmitButtonProps) => {
  const isFormCompleteAndValid = isValid && dirty;
  return (
    <Button
      {...props}
      onClick={onClick}
      size={size}
      type="submit"
      disabled={isSubmitting || !isFormCompleteAndValid}
    >
      {isSubmitting ? "Loading..." : children}
    </Button>
  );
};

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
  font-size: 0.9rem;
`;

export const TextField = styled(Field)`
  border-radius: ${ROUNDED_CORNERS};
  border: ${(props) => (props.error ? `1px solid ${COLOR_PALETTE.error}` : 0)};
  box-sizing: border-box;
  background: ${COLOR_PALETTE.inputBackground};
  font-size: 1rem;
  padding: 1.875rem 2.25rem;
  width: 100%;
  resize: none;
  transition: all ${ANIMATION_TIMES.fast} ease-in-out;

  :focus {
    outline: none;
    box-shadow: 0 0 0 3px
      ${(props) =>
        props.error
          ? `${COLOR_PALETTE.errorFaded}`
          : `${COLOR_PALETTE.primaryFaded}`};
  }

  :focus &::-webkit-input-placeholder {
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
  className,
  ...props
}: CheckboxProps) => (
  <CheckBoxWrapperEl className={className}>
    <CheckboxFieldEl {...props} id={name} name={name} />
    {label}
  </CheckBoxWrapperEl>
);
CheckboxField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  className: PropTypes.string,
};
