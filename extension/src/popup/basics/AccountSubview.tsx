import React from "react";
import styled, { css } from "styled-components";

import { POPUP_WIDTH } from "constants/dimensions";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { BackButton } from "./Buttons";

const BackButtonEl = styled(BackButton)`
  position: relative;
  top: 0;
  left: 0;
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

const SubviewBackButton = () => (
  <BackButtonEl onClick={() => navigateTo(ROUTES.account)} />
);

interface SubiewHeaderProps {
  headerText: string;
}

export const SubviewHeader = ({ headerText }: SubiewHeaderProps) => (
  <HeaderContainerEl>
    <SubviewBackButton />
    <HeaderEl>{headerText}</HeaderEl>
  </HeaderContainerEl>
);

export const SubviewWrapper = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2rem 2.5rem;
`;

export const ScrollingView = css`
  height: 14.375rem;
  overflow: scroll;
`;
