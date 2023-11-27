import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { migrateAccounts } from "popup/ducks/accountServices";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";

import {
  MigrationHeader,
  MigrationBody,
  MigrationButton,
  MigrationParagraph,
} from "../basics";

export const ConfirmMigration = () => {
  const { t } = useTranslation();
  const { recommendedFee } = useNetworkFees();
  const dispatch: AppDispatch = useDispatch();
  const { balancesToMigrate, isMergeSelected } = useSelector(
    transactionDataSelector,
  );

  const handleCancel = () => {
    window.close();
  };

  const handleContinue = async () => {
    const migrateAccountsRes = await dispatch(
      migrateAccounts({
        balancesToMigrate,
        isMergeSelected,
        recommendedFee,
      }),
    );

    if (migrateAccounts.fulfilled.match(migrateAccountsRes)) {
      navigateTo(ROUTES.accountMigration);
    }
  };

  return (
    <div className="AccountMigrationStart">
      <MigrationHeader>
        {t("Before we start with migration, please read")}
      </MigrationHeader>
      <MigrationBody>
        <MigrationParagraph>
          {t(
            "As long as you have your old and new mnemonics phrase, you’ll still be able to control accounts related to your current backup phrase which were not merged. For that, you’ll need to import your current backup phrase into Freighter (Freighter supports one backup phrase imported at a time).",
          )}
        </MigrationParagraph>
        <Notification title="Important" variant="warning">
          {t(
            "One of your accounts is a signer for another account. Freighter won’t migrate signing settings. For your safety, Freighter won’t merge accounts with signature set up so you can still control it.",
          )}
        </Notification>
      </MigrationBody>
      <MigrationButton>
        <Button onClick={handleCancel} size="md" variant="secondary">
          {t("Nevermind, cancel")}
        </Button>
        <Button onClick={handleContinue} size="md" variant="primary">
          {t("I understand, start migration")}
        </Button>
      </MigrationButton>
    </div>
  );
};
