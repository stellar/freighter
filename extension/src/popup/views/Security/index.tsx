import React from "react";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";

import "./styles.scss";

export const Security = () => {
  const { t } = useTranslation();

  return (
    <div className="Security">
      <SubviewHeader title="Security" />
      <ListNavLinkWrapper>
        {/* 
      TODO: Add Change Password
      <ListNavLink href="/">Change Password</ListNavLink> 
      */}
        <ListNavLink href={ROUTES.displayBackupPhrase}>
          {t("Show recovery phrase")}
        </ListNavLink>
      </ListNavLinkWrapper>
    </div>
  );
};
