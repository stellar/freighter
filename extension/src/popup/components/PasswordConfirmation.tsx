import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Formik } from "formik";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import {
  Form,
  SubmitButton,
  FormRow,
  ApiErrorMessage,
  TextField,
} from "popup/basics/Forms";

import { authErrorSelector } from "popup/ducks/authServices";

import WaveIllo from "popup/assets/illo-wave.svg";

const HeaderContainerEl = styled.div`
  display: flex;
  align-items: center;
  padding: 0 0.25rem 3rem;
  line-height: 1;
`;
const HeaderEl = styled.h1`
  display: inline-block;
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
  margin-left: 1rem;
`;
const CustomFormTextFieldEl = styled(TextField)`
  padding-right: ${(props) => (props.error ? "6rem" : "2.2rem")};
`;

const ButtonRowEl = styled.div`
  padding: 3.25rem 0 1.5rem;
`;
const IlloContainerEl = styled.div`
  position: relative;

  img {
    height: 4.0625rem;
  }
`;

interface PasswordConfirmationProps {
  handleSubmit: (values: any) => Promise<void>;
}

export const PasswordConfirmation = ({
  handleSubmit,
}: PasswordConfirmationProps) => {
  const authError = useSelector(authErrorSelector);

  interface FormValues {
    password: string;
  }
  const initialValues: FormValues = {
    password: "",
  };

  return (
    <>
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ dirty, isSubmitting, isValid }) => (
          <Form>
            <HeaderContainerEl>
              <IlloContainerEl>
                <img src={WaveIllo} alt="Wave Illustration" />
              </IlloContainerEl>
              <HeaderEl>Log in</HeaderEl>
            </HeaderContainerEl>
            <FormRow>
              <CustomFormTextFieldEl
                autoComplete="off"
                type="password"
                name="password"
                placeholder="Enter password"
                error={authError}
              />
            </FormRow>
            <ApiErrorMessage error={authError} />
            <ButtonRowEl>
              <SubmitButton
                dirty={dirty}
                isSubmitting={isSubmitting}
                isValid={isValid}
              >
                Log In
              </SubmitButton>
            </ButtonRowEl>
          </Form>
        )}
      </Formik>
    </>
  );
};
