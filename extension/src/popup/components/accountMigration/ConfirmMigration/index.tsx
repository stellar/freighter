import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Heading,
  Notification,
  Loader,
  Text,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Formik, Form } from "formik";

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

import "./styles.scss";

export const ConfirmMigration = () => {
  const { t } = useTranslation();
  const { recommendedFee } = useNetworkFees();
  const dispatch: AppDispatch = useDispatch<AppDispatch>();
  const { balancesToMigrate, isMergeSelected } = useSelector(
    transactionDataSelector,
  );
  const navigate = useNavigate();

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
      navigateTo(ROUTES.accountMigrationMigrationComplete, navigate);
    }
  };

  return (
    <div className="ConfirmMigration">
      <Formik initialValues={{}} onSubmit={handleContinue}>
        {({ isSubmitting }) => (
          <Form className="ConfirmMigration__form">
            {isSubmitting ? (
              <div className="ConfirmMigration__loader">
                <Loader size="2rem" />
                <Heading as="h1" size="xl">
                  <div>{t("Migrating...")}</div>
                </Heading>
                <Text as="div" size="md" className="MigrationParagraph">
                  {t("Please don't close this window.")}
                </Text>
              </div>
            ) : (
              <>
                <MigrationHeader>
                  {t("Before we start with migration, please read")}
                </MigrationHeader>
                <MigrationBody>
                  <MigrationParagraph>
                    {t(
                      "As long as you have your old and new mnemonics phrase, you'll still be able to control accounts related to your current backup phrase which were not merged. For that, you'll need to import your current backup phrase into Freighter (Freighter supports one backup phrase imported at a time).",
                    )}
                  </MigrationParagraph>
                  <Notification title={t("Important")} variant="warning">
                    {`${t("One of your accounts is a signer for another account.")} ${t("Freighter won't migrate signing settings.")} ${t("For your safety, Freighter won't merge accounts with signature set up so you can still control it.")}`}
                  </Notification>
                </MigrationBody>

                <MigrationButton>
                  <Button onClick={handleCancel} size="md" variant="secondary">
                    {t("Nevermind, cancel")}
                  </Button>
                  <Button
                    isLoading={isSubmitting}
                    size="md"
                    type="submit"
                    variant="primary"
                  >
                    {t("I understand, start migration")}
                  </Button>
                </MigrationButton>
              </>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
};
