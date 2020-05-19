import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { history } from "App";
import { applicationStateSelector, signOut } from "ducks/authServices";
import styled from "styled-components";
import { APPLICATION_STATE } from "statics";

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

const MenuOpenButton = styled.button`
  dislay: block;
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
          <MenuOpenButton onClick={() => setIsOpen(true)}>&lt;</MenuOpenButton>
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
