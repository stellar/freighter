import React from "react";
import { Switch } from "react-router-dom";

import { PublicKeyRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { MigrationStart } from "popup/components/accountMigration/MigrationStart";
import { ReviewMigration } from "popup/components/accountMigration/ReviewMigration";
import { MnemonicPhrase } from "popup/components/accountMigration/MnemonicPhrase";
import { ConfirmMigration } from "popup/components/accountMigration/ConfirmMigration";
import { MigrationComplete } from "popup/components/accountMigration/MigrationComplete";

import "./styles.scss";

export const AccountMigration = () => (
  <>
    <FullscreenStyle />
    <Header />

    <Switch>
      <PublicKeyRoute exact path={ROUTES.accountMigration}>
        <div className="AccountMigration">
          <MigrationStart />
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
      <PublicKeyRoute exact path={ROUTES.accountMigrationConfirmMigration}>
        <div className="AccountMigration">
          <ConfirmMigration />
        </div>
      </PublicKeyRoute>
      <PublicKeyRoute exact path={ROUTES.accountMigrationMigrationComplete}>
        <div className="AccountMigration">
          <MigrationComplete />
        </div>
      </PublicKeyRoute>
    </Switch>
  </>
);
