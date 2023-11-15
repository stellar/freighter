import React from "react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";

import { newTabHref } from "helpers/urls";
import { openTab } from "popup/helpers/navigate";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import {
  ListNavLink,
  ListNavButtonLink,
  ListNavLinkWrapper,
} from "popup/basics/ListNavLink";

import "./styles.scss";

export const Security = () => {
  const { t } = useTranslation();

  return (
    <View>
      <SubviewHeader title="Security" />
      <View.Content>
        <ListNavLinkWrapper>
          {/*
      TODO: Add Change Password
      <ListNavLink href="/">Change Password</ListNavLink>
      */}
          <ListNavLink href={ROUTES.displayBackupPhrase}>
            {t("Show recovery phrase")}
          </ListNavLink>
          <ListNavLink href={ROUTES.manageConnectedApps}>
            {t("Manage connected apps")}
          </ListNavLink>
          <ListNavButtonLink
            handleClick={() => {
              openTab(newTabHref(ROUTES.accountMigration));
            }}
          >
            {t("Account migration")}
          </ListNavButtonLink>
        </ListNavLinkWrapper>
      </View.Content>
    </View>
  );
};
