import React from "react";
import { useDispatch } from "react-redux";
import { Heading, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";
import { View } from "popup/basics/layout/View";

import { signOut } from "popup/ducks/accountServices";
import IconNetwork from "popup/assets/icon-settings-network.svg?react";
import IconSecurity from "popup/assets/icon-settings-security.svg?react";
import IconHelp from "popup/assets/icon-settings-help.svg?react";
import IconFeedback from "popup/assets/icon-settings-feedback.svg?react";
import IconAbout from "popup/assets/icon-settings-about.svg?react";
import IconLogout from "popup/assets/icon-settings-logout.svg?react";

import packageJson from "../../../../package.json";

import "./styles.scss";

export const Settings = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const signOutAndClose = async (e: React.FormEvent) => {
    e.preventDefault();
    // eslint-disable-next-line
    await dispatch(signOut());
    navigateTo(ROUTES.welcome);
  };

  return (
    <>
      <View.Content>
        <nav className="Settings">
          <div>
            <div className="Settings__header">
              <Heading as="h2" size="lg">
                Settings
              </Heading>
              <div className="Settings__version">{packageJson.version}</div>
            </div>
            <ListNavLinkWrapper>
              <div className="Settings__row">
                <ListNavLink
                  icon={<IconNetwork />}
                  href={ROUTES.networkSettings}
                >
                  {t("Network")}
                </ListNavLink>
              </div>

              <div className="Settings__row">
                <ListNavLink
                  href={ROUTES.preferences}
                  icon={<Icon.User02 className="Settings__icon__preferences" />}
                >
                  {t("Preferences")}
                </ListNavLink>
              </div>

              <div className="Settings__row">
                <ListNavLink href={ROUTES.security} icon={<IconSecurity />}>
                  {t("Security")}
                </ListNavLink>
              </div>
              <div className="Settings__row">
                <ListNavLink
                  href="https://www.freighter.app/faq"
                  icon={<IconHelp />}
                >
                  {t("Help")}
                </ListNavLink>
              </div>
              <div className="Settings__row">
                <ListNavLink
                  href={ROUTES.leaveFeedback}
                  icon={<IconFeedback />}
                >
                  {t("Leave Feedback")}
                </ListNavLink>
              </div>
              <div className="Settings__row">
                <ListNavLink href={ROUTES.about} icon={<IconAbout />}>
                  {t("About")}
                </ListNavLink>
              </div>
              <div className="Settings__row">
                <div className="Settings__icon">
                  <IconLogout />
                </div>
                <div
                  className="Settings__logout"
                  onClick={(e) => signOutAndClose(e)}
                >
                  {t("Log Out")}
                </div>
              </div>
            </ListNavLinkWrapper>
          </div>
        </nav>
      </View.Content>
    </>
  );
};
