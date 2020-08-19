import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  Z_INDEXES,
  COLOR_PALETTE,
  ANIMATION_TIMES,
} from "popup/constants/styles";
import { POPUP_WIDTH } from "constants/dimensions";

import { BasicButton } from "popup/basics/Buttons";

import { history } from "popup/constants/history";
import { applicationStateSelector, signOut } from "popup/ducks/authServices";
import { Header } from "popup/components/Header";

import CloseIcon from "popup/assets/icon-close.svg";
import MenuIcon from "popup/assets/icon-menu.svg";

const SlideoutNavEl = styled.nav`
  background: ${COLOR_PALETTE.menuGradient};
  height: 100%;
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  overflow: hidden;
  transition: margin ${ANIMATION_TIMES.medium} ease-out;
  margin-left: ${(props: { isOpen: boolean }) =>
    props.isOpen ? "0" : "-100%"};
  position: absolute;
  top: 0;
  left: 0;
  z-index: ${Z_INDEXES.nav};
`;
const MenuHeaderEl = styled(Header)`
  background: none;
`;
const MenuEl = styled.div`
  padding: 0.675rem 3.375rem;
`;
const MenuOpenButtonEl = styled(BasicButton)`
  padding: 10px 12px;
  border-radius: 0.25rem;
  transition: background ${ANIMATION_TIMES.fast} ease-out;

  &:hover {
    background: ${COLOR_PALETTE.inputBackground};
  }

  img {
    display: block;
    width: 1.625rem;
    height: 1.625rem;
  }
`;
const SlideOutCloseButtonEl = styled(BasicButton)`
  display: block;
  background: none;
  border: none;
  padding: 0;

  img {
    width: 1.25rem;
    height: 1.25rem;
  }
`;
const SlideoutNavListEl = styled.ul`
  list-style-type: none;
  padding: 1.25rem 0;
`;
const SlideoutNavListItemEl = styled.li`
  cursor: pointer;
  display: block;
  padding: 2rem 0;
  font-size: 1.5rem;
  font-weight: 200;
  color: white;

  a {
    color: white;
    position: relative;
    padding: 0.2rem 0.5rem;

    &::before {
      content: "";
      background-color: white;
      position: absolute;
      height: 1rem;
      left: 0;
      opacity: 0.25;
      bottom: 0;
      width: 100%;
      transform-origin: 0% 50%;
      transform: scale3d(0, 1, 1);
      transition: transform ${ANIMATION_TIMES.slow} cubic-bezier(0.2, 1, 0.3, 1);
    }

    &:hover {
      &::before {
        transform: scale3d(1, 1, 1);
      }
    }
  }
`;

export const Menu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const applicationState = useSelector(applicationStateSelector);

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    setIsOpen(false);
    history.push("/");
  };

  return applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED ? (
    <>
      <MenuOpenButtonEl onClick={() => setIsOpen(true)}>
        <img src={MenuIcon} alt="menu icon" />
      </MenuOpenButtonEl>
      <SlideoutNavEl isOpen={isOpen}>
        <MenuHeaderEl />
        <MenuEl>
          <SlideOutCloseButtonEl onClick={() => setIsOpen(false)}>
            <img src={CloseIcon} alt="close icon" />
          </SlideOutCloseButtonEl>
          <SlideoutNavListEl>
            <SlideoutNavListItemEl>
              <a href="/">Show backup phrase</a>
            </SlideoutNavListItemEl>
            <SlideoutNavListItemEl>
              <a href="/">Help</a>
            </SlideoutNavListItemEl>
            <SlideoutNavListItemEl onClick={(e) => signOutAndClose(e)}>
              <a href="/">Sign out</a>
            </SlideoutNavListItemEl>
          </SlideoutNavListEl>
        </MenuEl>
      </SlideoutNavEl>
    </>
  ) : null;
};
