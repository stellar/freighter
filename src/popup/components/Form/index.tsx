import React from "react";
import styled from "styled-components";
import { Form as FormikForm } from "formik";

interface FormProps {
  children: React.ReactNode;
}

const StyledForm = styled(FormikForm)`
  display: flex;
  flex-flow: column wrap;
`;

const Form = ({ children }: FormProps) => <StyledForm>{children}</StyledForm>;

export default Form;
