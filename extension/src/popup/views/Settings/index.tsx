import React from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import browser from "webextension-polyfill";

import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";
import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";
import { signOut } from "popup/ducks/accountServices";
import { navigateTo, openSidebar, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";

import IconNetwork from "popup/assets/icon-settings-network.svg?react";
import IconSecurity from "popup/assets/icon-settings-security.svg?react";
import IconHelp from "popup/assets/icon-settings-help.svg?react";
import IconFeedback from "popup/assets/icon-settings-feedback.svg?react";
import IconAbout from "popup/assets/icon-settings-about.svg?react";
import IconLogout from "popup/assets/icon-settings-logout.svg?react";

import packageJson from "../../../../package.json";

import "./styles.scss";

/** A labelled card of rows. */
const SettingsGroup = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="Settings__group">
    <div className="Settings__group__label">{label}</div>
    <nav className="Settings__group__rows">
      <ListNavLinkWrapper>{children}</ListNavLinkWrapper>
    </nav>
  </div>
);

/**
 * A row that performs an action rather than navigating. Deliberately has no
 * chevron -- that affordance means "there is a screen behind this".
 */
const SettingsAction = ({
  icon,
  label,
  onClick,
  isDestructive = false,
  "data-testid": dataTestId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  isDestructive?: boolean;
  "data-testid"?: string;
}) => (
  <div className="Settings__row">
    <div className="Settings__icon">{icon}</div>
    <div
      className={`Settings__action${
        isDestructive ? " Settings__action--destructive" : ""
      }`}
      onClick={onClick}
      data-testid={dataTestId}
    >
      {label}
    </div>
  </div>
);

export const Settings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  // Sidebar mode is unavailable on browsers without a side panel API.
  const isSidebarSupported =
    typeof globalThis.chrome?.sidePanel?.open === "function" ||
    typeof (browser as any)?.sidebarAction?.open === "function";

  const lockFreighter = async (e: React.MouseEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    navigateTo(ROUTES.unlockAccount, navigate);
  };

  const signOutAndClose = async (e: React.MouseEvent) => {
    e.preventDefault();
    await dispatch(signOut());
    navigateTo(ROUTES.account, navigate);
  };

  return (
    <>
      <SubviewHeader title={t("Settings")} customBackIcon={<Icon.X />} />
      <View.Content hasNoTopPadding>
        <SettingsGroup label={t("General")}>
          <div className="Settings__row">
            <ListNavLink
              href={ROUTES.preferences}
              icon={<Icon.UserCircle className="Settings__icon__preferences" />}
            >
              {t("Preferences")}
            </ListNavLink>
          </div>
          <div className="Settings__row">
            <ListNavLink
              dataTestId="settings-network-link"
              icon={<IconNetwork />}
              href={ROUTES.networkSettings}
            >
              {t("Network")}
            </ListNavLink>
          </div>
          {isSidebarSupported ? (
            <SettingsAction
              icon={<Icon.LayoutRight />}
              label={t("Sidebar mode")}
              onClick={() => openSidebar()}
              data-testid="settings-sidebar-mode"
            />
          ) : null}
          <SettingsAction
            icon={<Icon.Expand05 />}
            label={t("Fullscreen mode")}
            onClick={() => openTab(newTabHref(ROUTES.account))}
            data-testid="settings-fullscreen-mode"
          />
        </SettingsGroup>

        <SettingsGroup label={t("Security")}>
          <div className="Settings__row">
            <ListNavLink href={ROUTES.security} icon={<IconSecurity />}>
              {t("Security")}
            </ListNavLink>
          </div>
          <SettingsAction
            icon={<Icon.Lock01 />}
            label={t("Lock Freighter")}
            onClick={lockFreighter}
            data-testid="settings-lock-freighter"
          />
        </SettingsGroup>

        <SettingsGroup label={t("Support & About")}>
          <div className="Settings__row">
            <ListNavLink
              href="https://www.freighter.app/faq"
              icon={<IconHelp />}
            >
              {t("Help")}
            </ListNavLink>
          </div>
          <div className="Settings__row">
            <ListNavLink href={ROUTES.leaveFeedback} icon={<IconFeedback />}>
              {t("Leave Feedback")}
            </ListNavLink>
          </div>
          <div className="Settings__row">
            <ListNavLink
              href="https://docs.freighter.app/docs/whatsNew"
              icon={
                <Icon.Announcement01 className="Settings__icon__whatsNew" />
              }
              isExternal
            >
              {t("What’s new")}
            </ListNavLink>
          </div>
          <div className="Settings__row">
            <ListNavLink href={ROUTES.about} icon={<IconAbout />}>
              {t("About")}
            </ListNavLink>
          </div>
        </SettingsGroup>

        <div className="Settings__group">
          <nav className="Settings__group__rows">
            <SettingsAction
              icon={<IconLogout />}
              label={t("Log Out")}
              onClick={signOutAndClose}
              isDestructive
              data-testid="settings-log-out"
            />
          </nav>
        </div>

        <div className="Settings__version">
          <Icon.GitCommit />
          <span>
            {t("Version")} {packageJson.version}
          </span>
        </div>
      </View.Content>
    </>
  );
};
