import React from "react";
import styled from "styled-components";
import { Form as FormikForm } from "formik";

interface FormProps {
  children: React.ReactNode;
  className?: string;
}

const StyledForm = styled(FormikForm)`
  display: flex;
  flex-flow: column wrap;
`;

const Form = ({ children, className }: FormProps) => (
  <StyledForm className={className}>{children}</StyledForm>
);

export default Form;
