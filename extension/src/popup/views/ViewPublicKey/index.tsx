import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import QrCode from "qrcode.react";
import { Formik, Field, FieldProps, Form, useFormikContext } from "formik";
import { object as YupObject, string as YupString } from "yup";
import { Icon, Input, CopyText, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { isCustomNetwork } from "@shared/helpers/stellar";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import {
  accountNameSelector,
  publicKeySelector,
  updateAccountName,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import "./styles.scss";

export const ViewPublicKey = () => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const accountName = useSelector(accountNameSelector);
  const [isEditingName, setIsEditingName] = useState(false);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const EditNameButton = () => {
    const { submitForm } = useFormikContext();

    return isEditingName ? (
      <button onClick={() => submitForm()}>
        <Icon.Check />
      </button>
    ) : (
      <button onClick={() => setIsEditingName(true)}>
        <Icon.Edit01 />
      </button>
    );
  };

  const dispatch = useDispatch();

  interface FormValue {
    accountName: string;
  }

  const initialValues: FormValue = {
    accountName,
  };

  const handleSubmit = async (values: FormValue) => {
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
      // eslint-disable-next-line
      await dispatch(updateAccountName(newAccountName));
      emitMetric(METRIC_NAMES.viewPublicKeyAccountRenamed);
    }
    setIsEditingName(false);
  };

  return (
    <React.Fragment>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={YupObject().shape({
          accountName: YupString().max(24, t("max of 24 characters allowed")),
        })}
      >
        {({ errors }) => (
          <>
            <View.AppHeader
              hasBackButton
              centerContent={
                isEditingName ? (
                  <Form className="ViewPublicKey__form">
                    <Field name="accountName">
                      {({ field }: FieldProps) => (
                        <Input
                          fieldSize="md"
                          autoComplete="off"
                          id="accountName"
                          placeholder={accountName}
                          {...field}
                          error={errors.accountName}
                        />
                      )}
                    </Field>
                  </Form>
                ) : (
                  <div className="ViewPublicKey__account-name-display">
                    {accountName}
                  </div>
                )
              }
              rightContent={
                <div className="ViewPublicKey--account-name-div">
                  <EditNameButton />
                </div>
              }
            />
          </>
        )}
      </Formik>
      <View.Content>
        <div className="ViewPublicKey__content">
          <div className="ViewPublicKey__qr-code">
            <QrCode
              value={publicKey}
              style={{
                width: "10rem",
                height: "10rem",
              }}
            />
          </div>
          <div className="ViewPublicKey__address-copy-label">
            {t("Wallet Address")}
          </div>
          <div className="ViewPublicKey__address-copy">
            {truncatedPublicKey(publicKey)}
          </div>
          <div className="ViewPublicKey__copy-btn">
            <CopyText textToCopy={publicKey} doneLabel="ADDRESS COPIED">
              <Button size="md" variant="tertiary">
                {t("COPY")}
              </Button>
            </CopyText>
          </div>
        </div>
      </View.Content>
      <View.Footer>
        <div className="ViewPublicKey__external-link">
          {!isCustomNetwork(networkDetails) ? (
            <Button
              size="md"
              isFullWidth
              variant="tertiary"
              onClick={() => {
                openTab(
                  `https://stellar.expert/explorer/${networkDetails.network.toLowerCase()}/account/${publicKey}`,
                );
                emitMetric(METRIC_NAMES.viewPublicKeyClickedStellarExpert);
              }}
            >
              {t("View on")} stellar.expert
            </Button>
          ) : null}
        </div>
      </View.Footer>
    </React.Fragment>
  );
};
