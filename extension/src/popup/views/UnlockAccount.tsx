import React from "react";
import get from "lodash/get";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { Formik } from "formik";

import { newTabHref } from "helpers/urls";

import { ROUTES } from "popup/constants/routes";
import { history } from "popup/constants/history";
import { POPUP_WIDTH } from "constants/dimensions";
import { EMOJI } from "popup/constants/emoji";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { BasicButton } from "popup/basics/Buttons";
import {
  Form,
  SubmitButton,
  FormRow,
  ApiErrorMessage,
  TextField,
} from "popup/basics/Forms";

import { confirmPassword, authErrorSelector } from "popup/ducks/authServices";

const UnlockAccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2rem 2.5rem;
`;
const HeaderContainerEl = styled.div`
  display: flex;
  align-items: center;
  padding: 2.5rem 0.25rem;
  line-height: 1;
`;
const HeaderEl = styled.h1`
  display: inline-block;
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
  margin-left: 1rem;
`;
const ImportButtonEl = styled(BasicButton)`
  color: ${COLOR_PALETTE.primary};
`;
const UnorderedListEl = styled.ul`
  list-style-type: none;
  font-size: 0.8rem;
  text-align: center;
  margin: 0 auto;
  padding: 0;
  padding-top: 0.25rem;
`;
const CustomFormTextFieldEl = styled(TextField)`
  padding-right: ${(props) => (props.error ? "6rem" : "2.2rem")};
`;
const ListItemEl = styled.li`
  color: ${COLOR_PALETTE.secondaryText};
  padding: 0.5rem 0;
  line-height: 1;
`;
const ButtonRowEl = styled.div`
  padding: 1.5rem 0;
`;
const EmojiSpanEl = styled.span`
  font-size: 3rem;
`;
const ErrorEmojiEl = styled.div`
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);

  ${EmojiSpanEl} {
    font-size: 1.75rem;
  }
`;

export const UnlockAccount = () => {
  const location = useLocation();
  const from = get(location, "state.from.pathname", "");
  const queryParams = get(location, "search", "");
  const destination = from ? `${from}${queryParams}` : ROUTES.account;

  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  interface FormValues {
    password: string;
  }
  const initialValues: FormValues = {
    password: "",
  };

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    await dispatch(confirmPassword(password));
    history.push(destination);
  };

  return (
    <UnlockAccountEl>
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ isSubmitting, isValid }) => (
          <Form>
            <HeaderContainerEl>
              <EmojiSpanEl role="img" aria-label={EMOJI.wave.alt}>
                {EMOJI.wave.emoji}
              </EmojiSpanEl>
              <HeaderEl>Welcome back!</HeaderEl>
            </HeaderContainerEl>
            <FormRow>
              <CustomFormTextFieldEl
                autoComplete="off"
                type="password"
                name="password"
                placeholder="Enter password"
                error={authError}
              />
              {authError ? (
                <ErrorEmojiEl>
                  <EmojiSpanEl role="img" aria-label={EMOJI.vomit.alt}>
                    {EMOJI.vomit.emoji}
                  </EmojiSpanEl>
                  <EmojiSpanEl role="img" aria-label={EMOJI.poop.alt}>
                    {EMOJI.poop.emoji}
                  </EmojiSpanEl>
                </ErrorEmojiEl>
              ) : null}
            </FormRow>
            <ApiErrorMessage error={authError} />
            <ButtonRowEl>
              <SubmitButton isSubmitting={isSubmitting} isValid={isValid}>
                Log In
              </SubmitButton>
            </ButtonRowEl>
          </Form>
        )}
      </Formik>
      <UnorderedListEl>
        <ListItemEl>Want to add another account?</ListItemEl>
        <ListItemEl>
          <ImportButtonEl
            onClick={() => {
              window.open(newTabHref(ROUTES.recoverAccount));
            }}
          >
            Import using backup phrase
          </ImportButtonEl>
        </ListItemEl>
      </UnorderedListEl>
    </UnlockAccountEl>
  );
};
