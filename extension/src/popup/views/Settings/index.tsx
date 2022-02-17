import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Heading5 } from "@stellar/design-system";
import { Link } from "react-router-dom";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { BottomNav } from "popup/components/BottomNav";

import { applicationStateSelector, signOut } from "popup/ducks/accountServices";

import "./styles.scss";

export const Settings = () => {
  const dispatch = useDispatch();
  const applicationState = useSelector(applicationStateSelector);

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    navigateTo(ROUTES.welcome);
  };

  return applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED ? (
    <>
      <nav className="Settings">
        <div className="Settings--header">
          <Heading5>Settings</Heading5>
          <div className="Settings--version">
            {/* TODO: Make this dynamic */}
            v2.0.0
          </div>
        </div>
        <div className="Settings--nav-link">
          <Link to={ROUTES.preferences}>
            Preferences <Icon.ChevronRight />
          </Link>
        </div>
        <div className="Settings--nav-link">
          <Link to={ROUTES.unlockBackupPhrase}>
            Show backup phrase <Icon.ChevronRight />
          </Link>
        </div>

        <div className="Settings--nav-link">
          <a rel="noreferrer" target="_blank" href="http://freighter.app/help">
            Help
            <Icon.ChevronRight />
          </a>
        </div>
        <div className="Settings--nav-link">
          <a
            rel="noreferrer"
            target="_blank"
            href="https://stellarform.typeform.com/to/r4FiNpX1"
          >
            Leave Feedback
            <Icon.ChevronRight />
          </a>
        </div>
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
      <BottomNav />
    </>
  ) : null;
};
