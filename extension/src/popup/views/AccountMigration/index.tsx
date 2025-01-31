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

export const AccountMigration = () => {
  const reviewSlug = ROUTES.accountMigrationReviewMigration.split(
    "/account-migration/",
  )[1];
  const mnemonicPhraseSlug = ROUTES.accountMigrationMnemonicPhrase.split(
    "/account-migration/",
  )[1];
  const mnemonicConfirmPhraseSlug =
    ROUTES.accountMigrationConfirmMigration.split("/account-migration/")[1];
  const migrationCompleteSlug = ROUTES.accountMigrationMigrationComplete.split(
    "/account-migration/",
  )[1];
  return (
    <React.Fragment>
      <View.Header />
      <View.Content alignment="center">
        <Routes>
          <Route
            index
            element={
              <PublicKeyRoute>
                <div className="AccountMigration">
                  <MigrationStart />
                </div>
              </PublicKeyRoute>
            }
          ></Route>
          <Route
            path={reviewSlug}
            element={
              <PublicKeyRoute>
                <div className="AccountMigration">
                  <ReviewMigration />
                </div>
              </PublicKeyRoute>
            }
          ></Route>
          <Route
            path={mnemonicPhraseSlug}
            element={
              <VerifiedAccountRoute>
                <MnemonicPhrase />
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={mnemonicConfirmPhraseSlug}
            element={
              <VerifiedAccountRoute>
                <div className="AccountMigration">
                  <ConfirmMigration />
                </div>
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={migrationCompleteSlug}
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
  );
};
