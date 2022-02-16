import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { Button, Icon, Heading5 } from "@stellar/design-system";
import { Link } from "react-router-dom";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { COLOR_PALETTE, ANIMATION_TIMES } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { BasicButton } from "popup/basics/Buttons";

import { applicationStateSelector, signOut } from "popup/ducks/accountServices";

import MenuIcon from "popup/assets/icon-menu.svg";

import "./styles.scss";

const MenuOpenButtonEl = styled(BasicButton)`
  padding: 0.5rem;
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

export const Menu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const applicationState = useSelector(applicationStateSelector);

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    setIsOpen(false);
    navigateTo(ROUTES.welcome);
  };

  return applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED ? (
    <>
      <MenuOpenButtonEl onClick={() => setIsOpen(true)}>
        <img src={MenuIcon} alt="menu icon" />
      </MenuOpenButtonEl>
      <nav
        className={`Settings--slide-out ${
          isOpen ? "Settings--slide-out--open" : ""
        }`}
      >
        <Heading5>Settings</Heading5>
        <div className="Settings--nav-link">
          <Link to={ROUTES.settings}>Preferences</Link>
          <Icon.ChevronRight />
        </div>
        <div className="Settings--nav-link">
          <Link to={ROUTES.unlockBackupPhrase}>Show backup phrase</Link>
          <Icon.ChevronRight />
        </div>

        <div className="Settings--nav-link">
          <a rel="noreferrer" target="_blank" href="http://freighter.app/help">
            Help
          </a>
          <Icon.ChevronRight />
        </div>
        <div className="Settings--nav-link">
          <a
            rel="noreferrer"
            target="_blank"
            href="https://stellarform.typeform.com/to/r4FiNpX1"
          >
            Leave Feedback
          </a>
          <Icon.ChevronRight />
        </div>
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={(e) => signOutAndClose(e)}
        >
          Log Out
        </Button>
      </nav>
    </>
  ) : null;
};
