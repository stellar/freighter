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
import { getPathFromRoute } from "popup/helpers/route";

import "./styles.scss";

export const AccountMigration = () => {
  const accountMigrationBasePath = "/account-migration/";
  const reviewPath = getPathFromRoute({
    fullRoute: ROUTES.accountMigrationReviewMigration,
    basePath: accountMigrationBasePath,
  });
  const mnemonicPhrasePath = getPathFromRoute({
    fullRoute: ROUTES.accountMigrationMnemonicPhrase,
    basePath: accountMigrationBasePath,
  });
  const mnemonicConfirmPhrasePath = getPathFromRoute({
    fullRoute: ROUTES.accountMigrationConfirmMigration,
    basePath: accountMigrationBasePath,
  });
  const migrationCompletePath = getPathFromRoute({
    fullRoute: ROUTES.accountMigrationMigrationComplete,
    basePath: accountMigrationBasePath,
  });
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
            path={reviewPath}
            element={
              <PublicKeyRoute>
                <div className="AccountMigration">
                  <ReviewMigration />
                </div>
              </PublicKeyRoute>
            }
          ></Route>
          <Route
            path={mnemonicPhrasePath}
            element={
              <VerifiedAccountRoute>
                <MnemonicPhrase />
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={mnemonicConfirmPhrasePath}
            element={
              <VerifiedAccountRoute>
                <div className="AccountMigration">
                  <ConfirmMigration />
                </div>
              </VerifiedAccountRoute>
            }
          ></Route>
          <Route
            path={migrationCompletePath}
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
