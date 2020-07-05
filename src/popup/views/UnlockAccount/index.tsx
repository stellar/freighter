import React from "react";
import { get } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { Formik } from "formik";
import { newTabHref } from "helpers";
import { confirmPassword, authErrorSelector } from "popup/ducks/authServices";
import { history } from "popup/App";
import { POPUP_WIDTH, EMOJI } from "popup/constants";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/styles";
import {
  BasicButton,
  FormSubmitButton,
  FormRow,
  FormErrorEl,
  FormTextField,
} from "popup/basics";

import Form from "popup/components/Form";

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
const ImportButton = styled(BasicButton)`
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
const CustomFormTextField = styled(FormTextField)`
  padding-right: ${(props) => (props.hasError ? "6rem" : "2.2rem")};
`;
const ListItemEl = styled.li`
  color: ${COLOR_PALETTE.secondaryText};
  padding: 0.5rem 0;
  line-height: 1;
`;
const ButtonRow = styled.div`
  padding: 1.5rem 0;
`;
const EmojiSpan = styled.span`
  font-size: 3rem;
`;
const ErrorEmojiEl = styled.div`
  position: absolute;
  right: 2rem;
  top: 50%;
  transform: translateY(-50%);

  ${EmojiSpan} {
    font-size: 1.75rem;
  }
`;

export const UnlockAccount = () => {
  const location = useLocation();
  const from = get(location, "state.from.pathname", "");
  const queryParams = get(location, "search", "");
  const destination = from ? `${from}${queryParams}` : "/account";

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
              <EmojiSpan role="img" aria-label={EMOJI.wave.alt}>
                {EMOJI.wave.emoji}
              </EmojiSpan>
              <HeaderEl>Welcome back!</HeaderEl>
            </HeaderContainerEl>
            <FormRow>
              <CustomFormTextField
                autoComplete="off"
                type="password"
                name="password"
                placeholder="Enter password"
                hasError={authError}
              />
              {authError ? (
                <ErrorEmojiEl>
                  <EmojiSpan role="img" aria-label={EMOJI.vomit.alt}>
                    {EMOJI.vomit.emoji}
                  </EmojiSpan>
                  <EmojiSpan role="img" aria-label={EMOJI.poop.alt}>
                    {EMOJI.poop.emoji}
                  </EmojiSpan>
                </ErrorEmojiEl>
              ) : null}
            </FormRow>
            <FormErrorEl>
              {authError ? <label>{authError}</label> : null}
            </FormErrorEl>
            <ButtonRow>
              <FormSubmitButton
                buttonCTA="Log In"
                isSubmitting={isSubmitting}
                isValid={isValid}
              />
            </ButtonRow>
          </Form>
        )}
      </Formik>
      <UnorderedListEl>
        <ListItemEl>Want to add another account?</ListItemEl>
        <ListItemEl>
          <ImportButton
            onClick={() => {
              window.open(newTabHref("/mnemonic-phrase"));
            }}
          >
            Import using account see phrase
          </ImportButton>
        </ListItemEl>
      </UnorderedListEl>
    </UnlockAccountEl>
  );
};
