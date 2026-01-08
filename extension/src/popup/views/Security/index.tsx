import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

// import { newTabHref } from "helpers/urls";
// import { openTab } from "popup/helpers/navigate";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import {
  ListNavLink,
  // ListNavButtonLink,
  ListNavLinkWrapper,
} from "popup/basics/ListNavLink";

import IconAssetList from "popup/assets/icon-security-asset-list.svg?react";
import IconPhrase from "popup/assets/icon-security-phrase.svg?react";

import "./styles.scss";

export const Security = () => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <SubviewHeader title={t("Security")} />
      <View.Content hasNoTopPadding>
        <div className="Security">
          <ListNavLinkWrapper>
            {/*
        TODO: Add Change Password
        <ListNavLink href="/">Change Password</ListNavLink>
        */}
            <ListNavLink
              href={ROUTES.manageAssetsLists}
              icon={<IconAssetList />}
            >
              {t("Asset lists")}
            </ListNavLink>
            <ListNavLink
              href={ROUTES.displayBackupPhrase}
              icon={<IconPhrase />}
            >
              {t("Show recovery phrase")}
            </ListNavLink>
            <ListNavLink
              href={ROUTES.advancedSettings}
              icon={<Icon.LifeBuoy01 />}
            >
              {t("Advanced settings")}
            </ListNavLink>
            {/* <ListNavButtonLink
              handleClick={() => {
                openTab(newTabHref(ROUTES.accountMigration));
              }}
            >
              {t("Account migration")}
            </ListNavButtonLink> */}
          </ListNavLinkWrapper>
        </div>
      </View.Content>
    </React.Fragment>
  );
};
