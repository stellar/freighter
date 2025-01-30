import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { changeNetwork } from "popup/ducks/settings";
import { NETWORK_NAMES } from "@shared/constants/stellar";
import { AppDispatch } from "popup/App";

import {
  MigrationHeader,
  MigrationBody,
  MigrationParagraph,
  MigrationButton,
} from "../basics";

import "./styles.scss";

export const MigrationStart = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleContinue = async () => {
    // eslint-disable-next-line
    await dispatch(changeNetwork({ networkName: NETWORK_NAMES.PUBNET }));
    navigateTo(ROUTES.accountMigrationReviewMigration, navigate);
  };

  return isConfirmed ? (
    <div className="MigrationStart">
      <MigrationHeader>
        {t("Make sure you have your 12 word backup phrase")}
      </MigrationHeader>
      <MigrationBody hasWarning>
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
      </MigrationBody>
      <MigrationButton>
        <Button onClick={handleContinue} size="md" variant="secondary">
          {t("Continue")}
        </Button>
      </MigrationButton>
    </div>
  ) : (
    <div className="AccountMigrationStart">
      <MigrationHeader>{t("Account Migration")}</MigrationHeader>
      <MigrationBody>
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
      </MigrationBody>
      <MigrationButton>
        <Button
          size="md"
          variant="secondary"
          onClick={() => setIsConfirmed(true)}
        >
          {t("Continue")}
        </Button>
      </MigrationButton>
    </div>
  );
};
