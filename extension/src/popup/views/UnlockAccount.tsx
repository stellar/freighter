import React from "react";
import get from "lodash/get";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import styled from "styled-components";

import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE } from "popup/constants/styles";

import { navigateTo, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";

import { BasicButton } from "popup/basics/Buttons";

import { Header } from "popup/components/Header";
import { PasswordConfirmation } from "popup/components/PasswordConfirmation";

import { confirmPassword } from "popup/ducks/authServices";

const UnlockAccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2rem 2.5rem;
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
const ListItemEl = styled.li`
  color: ${COLOR_PALETTE.secondaryText};
  padding: 0.5rem 0;
  line-height: 1;
`;

export const UnlockAccount = () => {
  const location = useLocation();
  const from = get(location, "state.from.pathname", "") as ROUTES;
  const queryParams = get(location, "search", "");
  const destination = from || ROUTES.account;
  interface FormValues {
    password: string;
  }

  const dispatch = useDispatch();

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    await dispatch(confirmPassword(password));
    navigateTo(destination, queryParams);
  };

  return (
    <>
      <Header />
      <UnlockAccountEl>
        <PasswordConfirmation handleSubmit={handleSubmit} />
        <UnorderedListEl>
          <ListItemEl>Want to use a different account?</ListItemEl>
          <ListItemEl>
            <ImportButtonEl
              onClick={() => {
                openTab(newTabHref(ROUTES.recoverAccount));
              }}
            >
              Import using backup phrase
            </ImportButtonEl>
          </ListItemEl>
        </UnorderedListEl>
      </UnlockAccountEl>
    </>
  );
};
