import React from "react";

import { ROUTES } from "popup/constants/routes";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";

import { PopupWrapper } from "popup/basics/PopupWrapper";
import { ListNavLink } from "popup/basics/ListNavLink";

export const Security = () => (
  <>
    <PopupWrapper>
      <SubviewHeader title="Security" />
      {/* 
      TODO: Add Change Password
      <ListNavLink href="/">Change Password</ListNavLink> 
      */}
      <ListNavLink href={ROUTES.displayBackupPhrase}>
        Show recovery phrase
      </ListNavLink>
    </PopupWrapper>
    <BottomNav />
  </>
);
