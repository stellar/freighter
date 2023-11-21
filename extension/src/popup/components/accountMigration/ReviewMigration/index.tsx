import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Badge, Button, Checkbox, Loader } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";
import { getAccountInfo, getMigratableAccounts } from "@shared/api/internal";
import { BalanceToMigrate } from "@shared/api/types";
import { useTranslation } from "react-i18next";
import { BigNumber } from "bignumber.js";
import { Field, FieldProps, Form, Formik } from "formik";
import { object as YupObject, boolean as YupBoolean } from "yup";

import { ROUTES } from "popup/constants/routes";
import { BASE_RESERVE } from "popup/constants/transaction";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  saveBalancesToMigrate,
  saveIsMergeSelected,
} from "popup/ducks/transactionSubmission";

import { truncatedPublicKey } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

import {
  MigrationHeader,
  MigrationButton,
  MigrationParagraph,
} from "../basics";

import "./styles.scss";

type AccountList = {
  publicKey: string;
  name: string;
  trustlines: number;
  dataEntries: number;
  xlmBalance: string;
  trustlineBalances: Horizon.HorizonApi.BalanceLine[];
  isSigner: boolean;
  minBalance: string;
  keyIdIndex: number;
}[];

interface FormValues {
  isMergeSelected: boolean;
}

const AccountInfo = ({
  account,
}: {
  account: { publicKey: string; name: string };
}) => (
  <div className="ReviewMigration__account">
    <div className="ReviewMigration__account__identicon-wrapper">
      <IdenticonImg publicKey={account.publicKey} />
    </div>
    <div className="ReviewMigration__account__name">{account.name}</div>
    <div className="ReviewMigration__account__public-key">
      ({truncatedPublicKey(account.publicKey)})
    </div>
  </div>
);

const AccountListItems = ({ accountList }: { accountList: AccountList }) => {
  const { t } = useTranslation();

  return (
    <>
      {accountList.map((acct) => (
        <section className="ReviewMigration__section" key={acct.publicKey}>
          {acct.xlmBalance ? (
            <>
              <div className="ReviewMigration__row ReviewMigration__account-row">
                <AccountInfo account={acct} />
                <div className="ReviewMigration__badge">
                  <Badge>{t("Ready to migrate")}</Badge>
                </div>
              </div>
              <div className="ReviewMigration__row ReviewMigration__detail-row">
                <div>
                  {acct.trustlines} {t("trustlines")}
                </div>
                <div className="ReviewMigration__row__description">
                  {t("XLM balance")}:{" "}
                  <span className="ReviewMigration__highlight">
                    {acct.xlmBalance} {t("XLM")}
                  </span>
                </div>
              </div>
              <div className="ReviewMigration__row ReviewMigration__detail-row">
                <div>
                  {acct.dataEntries} {t("data entries")}
                </div>
                <div className="ReviewMigration__row__description">
                  {t("Minimum XLM needed")}:{" "}
                  <span className="ReviewMigration__highlight">
                    {acct.minBalance} XLM
                  </span>
                </div>
              </div>
              <div className="ReviewMigration__row ReviewMigration__detail-row">
                <div>
                  {acct.isSigner ? t("Signs for external accounts") : ""}
                </div>
                <div className="ReviewMigration__row__description">
                  {t("Cost to migrate")}:{" "}
                  <span className="ReviewMigration__highlight">0.0001 XLM</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="ReviewMigration__row ReviewMigration__account-row">
                <AccountInfo account={acct} />
                <div className="ReviewMigration__badge">
                  <Badge variant="warning">{t("Not funded")}</Badge>
                </div>
              </div>
            </>
          )}
        </section>
      ))}
    </>
  );
};

export const ReviewMigration = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [accountList, setAccountList] = useState([] as AccountList);

  useEffect(() => {
    const acctItemArr: AccountList = [];

    const fetchAccountData = async () => {
      const { migratableAccounts } = await getMigratableAccounts();
      console.log(migratableAccounts);

      if (!migratableAccounts) {
        return;
      }

      // eslint-disable-next-line no-plusplus
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
          trustlineBalances: [] as any,
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

          acctItem = {
            ...DEFAULT_ACCT_ITEM,
            trustlines: account.balances.length - 1,
            dataEntries: Object.keys(account.data_attr).length,
            xlmBalance: account.balances[account.balances.length - 1].balance,
            trustlineBalances: account.balances.filter(
              ({ asset_type: assetType }) => assetType !== "native",
            ),
            minBalance,
          };
        }

        acctItemArr.push(acctItem);
      }

      setAccountList(acctItemArr);
    };

    fetchAccountData();
  }, [networkDetails]);

  const handleSubmit = (values: FormValues) => {
    const migratableBalances: BalanceToMigrate[] = [];
    accountList.forEach(
      ({
        publicKey,
        minBalance,
        xlmBalance,
        trustlineBalances,
        keyIdIndex,
      }) => {
        if (xlmBalance) {
          migratableBalances.push({
            publicKey,
            minBalance,
            xlmBalance,
            trustlineBalances,
            keyIdIndex,
          });
        }
      },
    );
    dispatch(saveBalancesToMigrate(migratableBalances));
    dispatch(saveIsMergeSelected(values.isMergeSelected));
    navigateTo(ROUTES.accountMigrationMnemonicPhrase);
  };

  const initialValues: FormValues = {
    isMergeSelected: false,
  };

  const ReviewMigrationFormSchema = YupObject().shape({
    isMergeSelected: YupBoolean(),
  });

  console.log(accountList);

  return (
    <div className="ReviewMigration">
      <header className="ReviewMigration__header">
        <MigrationHeader>{t("Review accounts to migrate")}</MigrationHeader>
        <MigrationParagraph>
          {t("Only accounts ready for migration will be migrated.")}
        </MigrationParagraph>
      </header>
      {accountList.length ? (
        <AccountListItems accountList={accountList} />
      ) : (
        <div className="ReviewMigration__loader">
          <Loader />
        </div>
      )}
      <Formik
        onSubmit={handleSubmit}
        initialValues={initialValues}
        validationSchema={ReviewMigrationFormSchema}
      >
        {({ isSubmitting }) => (
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
                        <span className="ReviewMigration__highlight">
                          {t("Optional")}:{" "}
                        </span>
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
                size="md"
                variant="secondary"
                isLoading={isSubmitting}
                type="submit"
              >
                {t("Continue")}
              </Button>
            </MigrationButton>
          </Form>
        )}
      </Formik>
    </div>
  );
};
