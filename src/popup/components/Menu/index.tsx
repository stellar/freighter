import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { APPLICATION_STATE } from "statics";

import { BasicButton } from "popup/basics";
import { Z_INDEXES, COLOR_PALETTE } from "popup/styles";
import { POPUP_WIDTH } from "popup/constants";

import { history } from "popup/App";
import { applicationStateSelector, signOut } from "popup/ducks/authServices";
import { Header } from "popup/components/Layout/Header";

import CloseIcon from "popup/assets/icon-close.svg";
import MenuIcon from "popup/assets/menu.png";

const SlideoutNav = styled.nav`
  background: ${COLOR_PALETTE.menuGradient};
  height: 100%;
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  overflow: hidden;
  transition: margin 0.75s;
  margin-left: ${(props: { isOpen: boolean }) =>
    props.isOpen ? "0" : "-100%"};
  position: absolute;
  top: 0;
  z-index: ${Z_INDEXES.nav};
`;
const MenuHeader = styled(Header)`
  background: none;
`;
const MenuEl = styled.div`
  padding: 0.675rem 3.375rem;
`;
const MenuOpenButton = styled(BasicButton)`
  display: inline-block;
  background: url(${MenuIcon});
  background-size: cover;
  margin: 1.625rem 0 0 2.4rem;
  height: 1.625rem;
  width: 1.625rem;
`;
const SlideOutCloseButton = styled.button`
  display: block;
  background: none;
  border: none;
  padding: 0;

  img {
    width: 1.25rem;
    height: 1.25rem;
  }
`;
const SlideoutNavList = styled.ul`
  list-style-type: none;
  padding: 1.25rem 2rem;
`;
const SlideoutNavListItem = styled.li`
  display: block;
  padding: 2rem 0;
  font-size: 1.5rem;
  font-weight: 200;
  color: white;

  a {
    color: white;
  }
`;

const Menu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const applicationState = useSelector(applicationStateSelector);

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    setIsOpen(false);
    history.push("/");
  };

  return (
    <>
      {applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED ? (
        <>
          <MenuOpenButton onClick={() => setIsOpen(true)} />
          <SlideoutNav isOpen={isOpen}>
            <MenuHeader />
            <MenuEl>
              <SlideOutCloseButton onClick={() => setIsOpen(false)}>
                <img src={CloseIcon} alt="close icon" />
              </SlideOutCloseButton>
              <SlideoutNavList>
                <SlideoutNavListItem>
                  <a href="/">Show backup phrase</a>
                </SlideoutNavListItem>
                <SlideoutNavListItem>
                  <a href="/">Help</a>
                </SlideoutNavListItem>
                <SlideoutNavListItem onClick={(e) => signOutAndClose(e)}>
                  Sign out
                </SlideoutNavListItem>
              </SlideoutNavList>
            </MenuEl>
          </SlideoutNav>
        </>
      ) : null}
    </>
  );
};

export default Menu;
