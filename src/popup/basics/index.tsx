import React from "react";
import styled from "styled-components";
import { ErrorMessage, Field } from "formik";
import { COLOR_PALETTE } from "popup/styles";

interface ErrorMessageProps {
  error: string;
}

export const Button = styled.button`
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

const FormErrorEl = styled.div`
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

export const FormButton = styled(Button)`
  background: ${COLOR_PALETTE.primaryGradient};
  border-radius: 1.5rem;
  color: #fff;
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  line-height: 1.3rem;
  margin: 1rem auto;
  padding: 1.6rem 6rem;

  &:disabled {
    color: ${COLOR_PALETTE.secondaryText};
  }
`;

export const FormRow = styled.div`
  padding: 0.2rem 0;
  width: 24.5rem;
`;

export const FormError = ({ name }: { name: string }) => (
  <FormErrorEl>
    <ErrorMessage name={name} component="span" />
  </FormErrorEl>
);

export const FormTextField = styled(Field)`
  border-radius: 1.875rem;
  border: 0;
  box-sizing: border-box;
  background: ${COLOR_PALETTE.inputBackground};
  font-size: 1.125rem;
  padding: 1.875rem 3rem;
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
