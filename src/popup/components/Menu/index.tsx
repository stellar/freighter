import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { history } from "popup/App";
import { applicationStateSelector, signOut } from "popup/ducks/authServices";
import styled from "styled-components";
import { APPLICATION_STATE } from "statics";
import { Button } from "popup/basics";
import MenuIcon from "popup/assets/menu.png";

const SlideoutNav = styled.nav`
  background: purple;
  height: 100%;
  overflow: hidden;
  transition: margin 0.75s;
  margin-left: ${(props: { isOpen: boolean }) =>
    props.isOpen ? "0" : "-100%"};
  position: absolute;
  top: 0;
  width: 100%;
`;

const MenuOpenButton = styled(Button)`
  display: inline-block;
  background: url(${MenuIcon});
  background-size: cover;
  margin: 1.625rem 0 0 2.4rem;
  height: 1.625rem;
  width: 1.625rem;
`;

const SlideOutCloseButton = styled.button`
  display: block;
`;

const SlideoutNavItem = styled.a`
  color: white;
  display: block;
  margin: 10px 0;
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
            <SlideOutCloseButton onClick={() => setIsOpen(false)}>
              X
            </SlideOutCloseButton>
            <SlideoutNavItem href="/">Show backup Phrase</SlideoutNavItem>
            <SlideoutNavItem href="/">Help</SlideoutNavItem>
            <SlideoutNavItem onClick={(e) => signOutAndClose(e)} href="/">
              Sign out
            </SlideoutNavItem>
          </SlideoutNav>
        </>
      ) : null}
    </>
  );
};

export default Menu;
