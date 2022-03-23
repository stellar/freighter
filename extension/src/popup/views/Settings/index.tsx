import React from "react";
import { useDispatch } from "react-redux";
import { Button, Heading5 } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { PopupWrapper } from "popup/basics/PopupWrapper";
import { ListNavLink } from "popup/basics/ListNavLink";

import { BottomNav } from "popup/components/BottomNav";

import { signOut } from "popup/ducks/accountServices";

import "./styles.scss";

export const Settings = () => {
  const dispatch = useDispatch();

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    navigateTo(ROUTES.welcome);
  };

  return (
    <>
      <PopupWrapper>
        <nav className="Settings">
          <div className="Settings--header">
            <Heading5>Settings</Heading5>
            <div className="Settings--version">
              {/* TODO: Make this dynamic */}
              v2.0.0
            </div>
          </div>
          <ListNavLink href={ROUTES.preferences}>Preferences</ListNavLink>
          <ListNavLink href={ROUTES.security}>Security</ListNavLink>
          <ListNavLink href="http://freighter.app/help">Support</ListNavLink>
          <ListNavLink href="https://stellarform.typeform.com/to/r4FiNpX1">
            Leave Feedback
          </ListNavLink>
          <ListNavLink href={ROUTES.about}>About</ListNavLink>
          <div className="Settings--logout">
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              onClick={(e) => signOutAndClose(e)}
            >
              Log Out
            </Button>
          </div>
        </nav>
      </PopupWrapper>
      <BottomNav />
    </>
  );
};
