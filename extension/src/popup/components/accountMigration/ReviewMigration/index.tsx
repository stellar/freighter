import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Checkbox, Loader } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";
import { getAccountInfo, getMigratableAccounts } from "@shared/api/internal";
import { BalanceToMigrate } from "@shared/api/types";
import { useTranslation } from "react-i18next";
import { BigNumber } from "bignumber.js";
import { Field, FieldProps, Form, Formik, useFormikContext } from "formik";
import { object as YupObject, boolean as YupBoolean } from "yup";

import { ROUTES } from "popup/constants/routes";
import { BASE_RESERVE } from "@shared/constants/stellar";
import {
  calculateSenderMinBalance,
  getMigrationFeeAmount,
} from "@shared/helpers/migration";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  saveBalancesToMigrate,
  saveIsMergeSelected,
} from "popup/ducks/transactionSubmission";
import { useNetworkFees } from "popup/helpers/useNetworkFees";

import { navigateTo } from "popup/helpers/navigate";
import { AppDispatch } from "popup/App";

import {
  MigrationHeader,
  MigrationButton,
  MigrationParagraph,
  MigrationReviewHeader,
  MigrationReviewListSection,
  MigrationReviewListHeader,
  MigrationReviewHighlight,
  MigrationReviewDetailRow,
  MigrationReviewDescription,
  MigrationReviewAccountInfo,
  MigrationReviewBadge,
} from "../basics";

import "./styles.scss";

type AccountToMigrate = {
  publicKey: string;
  name: string;
  trustlines: number;
  dataEntries: number;
  xlmBalance: string;
  trustlineBalances: Horizon.HorizonApi.BalanceLine[];
  isSigner: boolean;
  minBalance: string;
  keyIdIndex: number;
};

interface FormValues {
  isMergeSelected: boolean;
}

const isReadyToMigrate = ({
  xlmBalance,
  dataEntries,
  isSigner,
  minBalance,
  recommendedFee,
  trustlineBalancesLength,
  isMergeSelected,
}: {
  xlmBalance: string;
  dataEntries: number;
  isSigner: boolean;
  minBalance: string;
  recommendedFee: string;
  trustlineBalancesLength: number;
  isMergeSelected: boolean;
}) =>
  Boolean(
    xlmBalance &&
      !dataEntries &&
      !isSigner &&
      calculateSenderMinBalance({
        minBalance,
        recommendedFee,
        trustlineBalancesLength,
        isMergeSelected,
      }) < new BigNumber(xlmBalance).minus(minBalance),
  );

type AccountListItemRow = AccountToMigrate & { isReadyToMigrate: boolean };

const AccountListItems = ({
  accountList,
  setIsSubmitDisabled,
}: {
  accountList: AccountToMigrate[];
  setIsSubmitDisabled: (isSubmitDisabled: boolean) => void;
}) => {
  const { t } = useTranslation();
  const { recommendedFee } = useNetworkFees();
  const formik = useFormikContext<FormValues>();
  const [accountListItems, setAccountListItems] = useState(
    [] as AccountListItemRow[],
  );

  const { isMergeSelected } = formik.values;

  useEffect(() => {
    const acctListItems: AccountListItemRow[] = [];
    if (!recommendedFee) {
      return;
    }
    accountList.forEach((acct) => {
      const acctIsReadyToMigrate = isReadyToMigrate({
        xlmBalance: acct.xlmBalance,
        dataEntries: acct.dataEntries,
        isSigner: acct.isSigner,
        minBalance: acct.minBalance,
        recommendedFee,
        trustlineBalancesLength: acct.trustlineBalances.length,
        isMergeSelected,
      });

      if (!acctIsReadyToMigrate) {
        setIsSubmitDisabled(true);
      }

      acctListItems.push({
        ...acct,
        isReadyToMigrate: acctIsReadyToMigrate,
      });
    });

    setAccountListItems(acctListItems);
  }, [accountList, isMergeSelected, recommendedFee, setIsSubmitDisabled]);

  return accountListItems.length ? (
    <>
      {accountListItems.map((acct) => (
        <MigrationReviewListSection
          isUnfunded={!acct.xlmBalance}
          key={acct.publicKey}
        >
          {acct.xlmBalance ? (
            <>
              <div>
                <MigrationReviewListHeader>
                  <MigrationReviewAccountInfo
                    publicKey={acct.publicKey}
                    name={acct.name}
                  />
                </MigrationReviewListHeader>
                <MigrationReviewDetailRow>
                  <div>
                    {acct.trustlines} {t("trustlines")}
                  </div>
                </MigrationReviewDetailRow>
                <MigrationReviewDetailRow>
                  <div>
                    {acct.dataEntries} {t("data entries")}
                  </div>
                </MigrationReviewDetailRow>
                <MigrationReviewDetailRow>
                  <div>
                    {acct.isSigner ? t("Signs for external accounts") : ""}
                  </div>
                </MigrationReviewDetailRow>
              </div>

              <div>
                <MigrationReviewListHeader>
                  <MigrationReviewBadge>
                    {acct.isReadyToMigrate ? (
                      <Badge>{t("Ready to migrate")}</Badge>
                    ) : (
                      <Badge variant="warning">{t("Unable to migrate")}</Badge>
                    )}
                  </MigrationReviewBadge>
                </MigrationReviewListHeader>

                <MigrationReviewDescription
                  description="XLM balance"
                  highlight={acct.xlmBalance}
                />
                <MigrationReviewDescription
                  description="Minimum XLM needed"
                  highlight={new BigNumber(acct.minBalance)
                    .times(2)
                    .plus(
                      getMigrationFeeAmount({
                        recommendedFee,
                        trustlineBalancesLength: acct.trustlineBalances.length,
                        isMergeSelected,
                      }).toString(),
                    )
                    .toString()}
                />
                <MigrationReviewDescription
                  description="Cost to migrate"
                  highlight={getMigrationFeeAmount({
                    recommendedFee,
                    trustlineBalancesLength: acct.trustlineBalances.length,
                    isMergeSelected,
                  }).toString()}
                />
              </div>
            </>
          ) : (
            <>
              <MigrationReviewListHeader>
                <MigrationReviewAccountInfo
                  publicKey={acct.publicKey}
                  name={acct.name}
                />
              </MigrationReviewListHeader>
              <MigrationReviewListHeader>
                <MigrationReviewBadge>
                  <Badge variant="warning">{t("Not funded")}</Badge>
                </MigrationReviewBadge>
              </MigrationReviewListHeader>
            </>
          )}
        </MigrationReviewListSection>
      ))}
    </>
  ) : (
    <div className="ReviewMigration__loader">
      <Loader />
    </div>
  );
};

export const ReviewMigration = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [accountToMigrateList, setAccountToMigrateList] = useState(
    [] as AccountToMigrate[],
  );
  const [isSubmitDisabled, setIsSubmitDisabled] = useState(false);
  const { recommendedFee } = useNetworkFees();

  useEffect(() => {
    const acctItemArr: AccountToMigrate[] = [];
    let hasUnmigratableAccount = false;

    const fetchAccountData = async () => {
      const { migratableAccounts } = await getMigratableAccounts();

      if (!migratableAccounts || !recommendedFee) {
        hasUnmigratableAccount = true;
        return;
      }

      // eslint-disable-next-line
      for (let i = 0; i < migratableAccounts.length; i++) {
        const publicKey = migratableAccounts[i].publicKey;

        // eslint-disable-next-line no-await-in-loop
        const { account, isSigner } = await getAccountInfo({
          publicKey,
          networkDetails,
        });

        const DEFAULT_ACCT_ITEM = {
          publicKey,
          name: migratableAccounts[i].name,
          trustlines: 0,
          dataEntries: 0,
          xlmBalance: "",
          trustlineBalances: [] as Horizon.HorizonApi.BalanceLine[],
          isSigner,
          minBalance: "",
          keyIdIndex: migratableAccounts[i].keyIdIndex,
        };

        let acctItem = {
          ...DEFAULT_ACCT_ITEM,
        };

        if (account) {
          const minBalance = new BigNumber(
            (2 + account.subentry_count) * BASE_RESERVE,
          ).toString();

          const xlmBalance =
            account.balances[account.balances.length - 1].balance;
          const dataEntries = Object.keys(account.data_attr).length;
          const trustlineBalances = account.balances.filter(
            ({ asset_type: assetType }) => assetType !== "native",
          );

          acctItem = {
            ...DEFAULT_ACCT_ITEM,
            trustlines: account.balances.length - 1,
            dataEntries,
            xlmBalance,
            trustlineBalances,
            minBalance,
          };
        } else {
          hasUnmigratableAccount = true;
        }

        acctItemArr.push(acctItem);
      }

      setAccountToMigrateList(acctItemArr);
      setIsSubmitDisabled(hasUnmigratableAccount);
    };

    fetchAccountData();
  }, [networkDetails, recommendedFee]);

  const handleSubmit = (values: FormValues) => {
    const migratableBalances: BalanceToMigrate[] = [];
    accountToMigrateList.forEach(
      ({
        publicKey,
        name,
        minBalance,
        xlmBalance,
        trustlineBalances,
        keyIdIndex,
      }) => {
        migratableBalances.push({
          publicKey,
          name,
          minBalance,
          xlmBalance,
          trustlineBalances,
          keyIdIndex,
        });
      },
    );
    dispatch(saveBalancesToMigrate(migratableBalances));
    dispatch(saveIsMergeSelected(values.isMergeSelected));
    navigateTo(ROUTES.accountMigrationMnemonicPhrase, navigate);
  };

  const initialValues: FormValues = {
    isMergeSelected: false,
  };

  const ReviewMigrationFormSchema = YupObject().shape({
    isMergeSelected: YupBoolean(),
  });

  return (
    <div className="ReviewMigration">
      <MigrationReviewHeader>
        <MigrationHeader>{t("Review accounts to migrate")}</MigrationHeader>
        <MigrationParagraph>
          {t("Only accounts ready for migration will be migrated.")}
        </MigrationParagraph>
      </MigrationReviewHeader>
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={ReviewMigrationFormSchema}
      >
        {({ isSubmitting }) => (
          <>
            <AccountListItems
              accountList={accountToMigrateList}
              setIsSubmitDisabled={setIsSubmitDisabled}
            />
            <Form className="NetworkForm__form">
              <div className="ReviewMigration__option">
                <Field name="isMergeSelected">
                  {({ field }: FieldProps) => (
                    <Checkbox
                      fieldSize="md"
                      autoComplete="off"
                      id="isMergeSelected-input"
                      label={
                        <div>
                          <MigrationReviewHighlight
                            text={`${t("Optional")}: `}
                          />
                          {t(
                            "Merge accounts after migrating (your funding lumens used to fund the current accounts will be sent to the new ones - you lose access to the current accounts.)",
                          )}
                        </div>
                      }
                      {...field}
                    />
                  )}
                </Field>
              </div>
              <MigrationButton>
                <Button
                  disabled={isSubmitDisabled}
                  size="md"
                  variant="secondary"
                  isLoading={isSubmitting}
                  type="submit"
                >
                  {t("Continue")}
                </Button>
              </MigrationButton>
            </Form>
          </>
        )}
      </Formik>
    </div>
  );
};
