import React, { useState } from "react";
import { Button, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import { MigrationHeader, MigrationParagraph } from "../basics";

import "./styles.scss";

export const AccountMigrationStart = () => {
  const { t } = useTranslation();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleContinue = () => {
    navigateTo(ROUTES.accountMigrationReviewMigration);
  };

  return isConfirmed ? (
    <div className="AccountMigrationStart">
      <MigrationHeader>
        {t("Make sure you have your 12 word backup phrase")}
      </MigrationHeader>
      <div className="AccountMigrationStart__body AccountMigrationStart__body--warning">
        <MigrationParagraph>
          {t(
            "At the end of this process, Freighter will only display accounts related to the new backup phrase. You’ll still be able to import your current backup phrase into Freighter and control current accounts as long as they were not merged into the new accounts.",
          )}
        </MigrationParagraph>
        <Notification title="Important, Please Read" variant="warning">
          {t(
            "Make sure you have your current 12 words backup phrase before continuing.",
          )}
        </Notification>
      </div>
      <div className="AccountMigrationStart__button">
        <Button onClick={handleContinue} size="md" variant="secondary">
          {t("Continue")}
        </Button>
      </div>
    </div>
  ) : (
    <div className="AccountMigrationStart">
      <MigrationHeader>{t("Account Migration")}</MigrationHeader>
      <div className="AccountMigrationStart__body">
        <MigrationParagraph>
          {t(
            "In this process, Freighter will create a new backup phrase for you and migrate your lumens, trustlines, and assets to the new account.",
          )}
        </MigrationParagraph>
        <MigrationParagraph>
          {t(
            "You can choose to merge your current account into the new accounts after the migration, which will effectively destroy your current account. Merging is optional and will allow you to send your current account’s funding lumens to the new accounts.",
          )}
        </MigrationParagraph>
      </div>
      <div className="AccountMigrationStart__button">
        <Button
          size="md"
          variant="secondary"
          onClick={() => setIsConfirmed(true)}
        >
          {t("Continue")}
        </Button>
      </div>
    </div>
  );
};
