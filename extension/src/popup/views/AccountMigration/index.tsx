import React from "react";
import { Route, Routes } from "react-router-dom";

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
          <Route
            path={ROUTES.accountMigration}
            element={
              <PublicKeyRoute>
                <div className="AccountMigration">
                  <MigrationStart />
                </div>
              </PublicKeyRoute>
            }
          ></Route>
          <Route
            path={ROUTES.accountMigrationReviewMigration}
            element={
              <PublicKeyRoute>
                <div className="AccountMigration">
                  <ReviewMigration />
                </div>
              </PublicKeyRoute>
            }
          ></Route>
          <Route
            path={ROUTES.accountMigrationMnemonicPhrase}
            element={
              <VerifiedAccountRoute>
                <MnemonicPhrase />
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={ROUTES.accountMigrationMnemonicPhrase}
            element={
              <VerifiedAccountRoute>
                <MnemonicPhrase />
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={ROUTES.accountMigrationConfirmMigration}
            element={
              <VerifiedAccountRoute>
                <div className="AccountMigration">
                  <ConfirmMigration />
                </div>
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={ROUTES.accountMigrationMigrationComplete}
            element={
              <PublicKeyRoute>
                <div className="AccountMigration">
                  <MigrationComplete />
                </div>
              </PublicKeyRoute>
            }
          ></Route>
        </Routes>
      </View.Content>
    </React.Fragment>
  </>
);
