import React from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";

import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { navigateTo } from "popup/helpers/navigate";

import { PasswordConfirmation } from "popup/components/PasswordConfirmation";

import { addAccount } from "popup/ducks/authServices";

import { BackButton } from "popup/basics/Buttons";

const UnlockAccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2rem 2.5rem;
`;
export const HeaderContainerEl = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  line-height: 1;
  margin-bottom: 2.5rem;
`;
export const HeaderEl = styled.h1`
color: ${COLOR_PALETTE.primary}};
font-weight: ${FONT_WEIGHT.light};
font-size: 1.56rem;
margin: 0;
padding-left: 1rem;
`;
export const BackButtonEl = styled(BackButton)`
  position: relative;
  top: 0;
  left: 0;
`;

export const AddAccount = () => {
  interface FormValues {
    password: string;
  }

  const dispatch = useDispatch();

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    await dispatch(addAccount(password));
    navigateTo(ROUTES.account);
  };

  return (
    <>
      <UnlockAccountEl>
        <HeaderContainerEl>
          <BackButtonEl onClick={() => navigateTo(ROUTES.account)} />
          <HeaderEl>Add Account</HeaderEl>
        </HeaderContainerEl>
        <PasswordConfirmation handleSubmit={handleSubmit} />
      </UnlockAccountEl>
    </>
  );
};
