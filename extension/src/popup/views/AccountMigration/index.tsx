import React from "react";
import { Switch } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { AccountMigrationStart } from "popup/components/accountMigration/Start";
import { ReviewMigration } from "popup/components/accountMigration/ReviewMigration";

import "./styles.scss";

export const AccountMigration = () => (
  <>
    <FullscreenStyle />
    <Header />

    <div className="AccountMigration">
      <Switch>
        <PublicKeyRoute exact path={ROUTES.accountMigration}>
          <AccountMigrationStart />
        </PublicKeyRoute>
        <PublicKeyRoute exact path={ROUTES.accountMigrationReviewMigration}>
          <ReviewMigration />
        </PublicKeyRoute>
      </Switch>
    </div>
  </>
);
