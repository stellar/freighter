import React from "react";
import { Form as FormikForm } from "formik";
import { FormButton } from "popup/basics";

interface FormProps {
  children: JSX.Element;
  formCTA: string;
  isSubmitting: boolean;
  isValid: boolean;
}

const Form = ({ children, isSubmitting, isValid, formCTA }: FormProps) => (
  <FormikForm>
    {children}
    <FormButton type="submit" disabled={isSubmitting || !isValid}>
      {isSubmitting ? "Loading..." : formCTA}
    </FormButton>
  </FormikForm>
);

export default Form;
