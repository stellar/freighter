import React from "react";
import { Switch } from "react-router-dom";

import { PublicKeyRoute, VerifiedAccountRoute } from "popup/Router";
import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";

import { MigrationStart } from "popup/components/accountMigration/MigrationStart";
import { ReviewMigration } from "popup/components/accountMigration/ReviewMigration";
import { MnemonicPhrase } from "popup/components/accountMigration/MnemonicPhrase";
import { ConfirmMigration } from "popup/components/accountMigration/ConfirmMigration";
import { MigrationComplete } from "popup/components/accountMigration/MigrationComplete";

import "./styles.scss";

export const AccountMigration = () => (
  <>
    <React.Fragment>
      <View.Header />
      <View.Content alignment="center">
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
          <VerifiedAccountRoute
            exact
            path={ROUTES.accountMigrationMnemonicPhrase}
          >
            <MnemonicPhrase />
          </VerifiedAccountRoute>
          <VerifiedAccountRoute
            exact
            path={ROUTES.accountMigrationConfirmMigration}
          >
            <div className="AccountMigration">
              <ConfirmMigration />
            </div>
          </VerifiedAccountRoute>
          <PublicKeyRoute exact path={ROUTES.accountMigrationMigrationComplete}>
            <div className="AccountMigration">
              <MigrationComplete />
            </div>
          </PublicKeyRoute>
        </Switch>
      </View.Content>
    </React.Fragment>
  </>
);
