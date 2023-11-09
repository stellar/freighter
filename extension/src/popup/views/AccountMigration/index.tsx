import React from "react";
import { Switch } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { AccountMigrationStart } from "popup/components/accountMigration/Start";
import { ReviewMigration } from "popup/components/accountMigration/ReviewMigration";
import { MnemonicPhrase } from "popup/components/accountMigration/MnemonicPhrase";

import "./styles.scss";

export const AccountMigration = () => (
  <>
    <FullscreenStyle />
    <Header />

    <Switch>
      <PublicKeyRoute exact path={ROUTES.accountMigration}>
        <div className="AccountMigration">
          <AccountMigrationStart />
        </div>
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.accountMigrationReviewMigration}>
        <div className="AccountMigration">
          <ReviewMigration />
        </div>
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.accountMigrationMnemonicPhrase}>
        <MnemonicPhrase />
      </PublicKeyRoute>
    </Switch>
  </>
);
