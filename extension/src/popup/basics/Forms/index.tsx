import React from "react";
import PropTypes from "prop-types";
import styled, { css } from "styled-components";
import { Form as FormikForm, ErrorMessage, Field } from "formik";

import {
  FONT_FAMILY,
  COLOR_PALETTE,
  ANIMATION_TIMES,
  ROUNDED_CORNERS,
} from "popup/constants/styles";
import { Button } from "popup/basics/Buttons";

import CheckIcon from "popup/assets/check.svg";

import "./styles.scss";

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

const FormErrorEl = styled.div`
  color: ${COLOR_PALETTE.error};
  font-size: 0.8125rem;
  padding: 0.25rem 0 0.75rem;
  text-align: center;
  line-height: 1;
`;

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
    font-family: ${FONT_FAMILY};
  }

  &:-ms-input-placeholder {
    font-family: ${FONT_FAMILY};
  }

  &:-moz-placeholder {
    font-family: ${FONT_FAMILY};
  }

  &::-moz-placeholder {
    font-family: ${FONT_FAMILY};
  }
`;

const CheckAndRadioWrapperEl = styled(Label)`
  display: flex;
  align-items: center;
`;

const CheckAndRadioFieldStyle = css`
  position: relative;
  margin-right: 0.625rem;
  appearance: unset;
  align-items: center;
  background: ${COLOR_PALETTE.inputBackground};
  border: 0.125rem solid ${COLOR_PALETTE.inputBackground};
  color: ${COLOR_PALETTE.primary};
  cursor: pointer;
  display: flex;
  flex: 1 0 auto;
  height: 2rem;
  justify-content: center;
  width: 2rem;

  &:checked:after {
    content: "";
    position: absolute;
  }
`;

const CheckboxFieldEl = styled(Field).attrs(() => ({ type: "checkbox" }))`
  ${CheckAndRadioFieldStyle}
  border-radius: 0.625rem;
  &:checked:after {
    background: url("${CheckIcon}") no-repeat;
    height: 1rem;
    margin: 0.36rem 0.28rem;
    width: 1.3125rem;
  }
`;

interface CheckAndRadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode;
}

export const CheckboxField = ({
  name,
  label,
  className,
  ...props
}: CheckAndRadioProps) => (
  <CheckAndRadioWrapperEl className={className}>
    <CheckboxFieldEl {...props} id={name} name={name} />
    {label}
  </CheckAndRadioWrapperEl>
);

CheckboxField.propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.node.isRequired,
  className: PropTypes.string,
};

const RadioFieldEl = styled(Field).attrs(() => ({ type: "radio" }))`
  ${CheckAndRadioFieldStyle}
  border-radius: 2rem;
  &:checked:after {
    background: ${COLOR_PALETTE.primary};
    border-radius: 2rem;
    height: 0.875rem;
    width: 0.875rem;
  }
`;

export const RadioField = ({
  name,
  label,
  className,
  ...props
}: CheckAndRadioProps) => (
  <CheckAndRadioWrapperEl className={className}>
    <RadioFieldEl {...props} id={name} name={name} />
    {label}
  </CheckAndRadioWrapperEl>
);

// CSS Form Basic

interface FormRowsProps {
  children: React.ReactNode;
}
export const FormRows = ({ children }: FormRowsProps) => (
  <div className="FormRows">{children}</div>
);

interface SubmitButtonWrapperProps {
  children: React.ReactNode;
}
export const SubmitButtonWrapper = ({ children }: SubmitButtonWrapperProps) => (
  <div className="SubmitButtonWrapper">{children}</div>
);

interface ErrorMessageProps {
  children: React.ReactNode;
}
export const FormError = ({ children }: ErrorMessageProps) => (
  <div className="FormError">{children}</div>
);
