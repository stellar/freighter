import React from "react";
import { useDispatch } from "react-redux";
import { Button, Heading } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";

import { BottomNav } from "popup/components/BottomNav";

import { signOut } from "popup/ducks/accountServices";

import packageJson from "../../../../package.json";

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
            <Heading as="h5" size="md">
              Settings
            </Heading>
            <div className="Settings__version">{packageJson.version}</div>
          </div>
          <ListNavLinkWrapper>
            <ListNavLink href={ROUTES.networkSettings}>
              {t("Network Settings")}
            </ListNavLink>
            <ListNavLink href={ROUTES.preferences}>
              {t("Preferences")}
            </ListNavLink>
            <ListNavLink href={ROUTES.security}>{t("Security")}</ListNavLink>
            <ListNavLink href="https://www.freighter.app/faq">
              {t("Help")}
            </ListNavLink>
            <ListNavLink href={ROUTES.leaveFeedback}>
              {t("Leave Feedback")}
            </ListNavLink>
            <ListNavLink href={ROUTES.about}>{t("About")}</ListNavLink>
          </ListNavLinkWrapper>
        </div>
        <div className="Settings__logout">
          <Button
            size="md"
            isFullWidth
            variant="secondary"
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
