import React from "react";
import { Routes } from "react-router-dom";

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
        <Routes>
          <PublicKeyRoute path={ROUTES.accountMigration}>
            <div className="AccountMigration">
              <MigrationStart />
            </div>
          </PublicKeyRoute>
          <PublicKeyRoute path={ROUTES.accountMigrationReviewMigration}>
            <div className="AccountMigration">
              <ReviewMigration />
            </div>
          </PublicKeyRoute>
          <VerifiedAccountRoute path={ROUTES.accountMigrationMnemonicPhrase}>
            <MnemonicPhrase />
          </VerifiedAccountRoute>
          <VerifiedAccountRoute path={ROUTES.accountMigrationConfirmMigration}>
            <div className="AccountMigration">
              <ConfirmMigration />
            </div>
          </VerifiedAccountRoute>
          <PublicKeyRoute path={ROUTES.accountMigrationMigrationComplete}>
            <div className="AccountMigration">
              <MigrationComplete />
            </div>
          </PublicKeyRoute>
        </Routes>
      </View.Content>
    </React.Fragment>
  </>
);
