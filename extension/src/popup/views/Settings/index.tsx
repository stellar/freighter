import React from "react";
import { useDispatch } from "react-redux";
import { Heading5 } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { Button } from "popup/basics/buttons/Button";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";

import { BottomNav } from "popup/components/BottomNav";

import { signOut } from "popup/ducks/accountServices";

import "./styles.scss";

export const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    navigateTo(ROUTES.welcome);
  };

  return (
    <>
      <nav className="Settings">
        <div>
          <div className="Settings__header">
            <Heading5>Settings</Heading5>
            <div className="Settings__version">
              {/* TODO: Make this dynamic */}
              v2.4.1
            </div>
          </div>
          <ListNavLinkWrapper>
            <ListNavLink href={ROUTES.preferences}>
              {t("Preferences")}
            </ListNavLink>
            <ListNavLink href={ROUTES.security}>{t("Security")}</ListNavLink>
            <ListNavLink href="http://freighter.app/help">
              {t("Help")}
            </ListNavLink>
            <ListNavLink href="https://stellarform.typeform.com/to/r4FiNpX1">
              {t("Leave Feedback")}
            </ListNavLink>
            <ListNavLink href={ROUTES.about}>{t("About")}</ListNavLink>
          </ListNavLinkWrapper>
        </div>
        <div className="Settings__logout">
          <Button
            fullWidth
            variant={Button.variant.tertiary}
            onClick={(e) => signOutAndClose(e)}
          >
            {t("Log Out")}
          </Button>
        </div>
      </nav>
      <BottomNav />
    </>
  );
};
