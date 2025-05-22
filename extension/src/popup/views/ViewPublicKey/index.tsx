import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react";
import { Formik, Field, FieldProps, Form, useFormikContext } from "formik";
import { object as YupObject, string as YupString } from "yup";
import {
  Icon,
  Input,
  CopyText,
  Button,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { isCustomNetwork } from "@shared/helpers/stellar";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import {
  accountNameSelector,
  updateAccountName,
} from "popup/ducks/accountServices";

import "./styles.scss";
import { AppDispatch } from "popup/App";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { reRouteOnboarding } from "popup/helpers/route";

export const ViewPublicKey = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isEditingName, setIsEditingName] = useState(false);
  const accountName = useSelector(accountNameSelector);
  const { state, fetchData } = useGetAppData();

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

  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.account.applicationState,
    state: state.state,
  });

  const { publicKey } = state.data.account;
  const { networkDetails } = state.data.settings;

  interface FormValue {
    accountName: string;
  }

  const initialValues: FormValue = {
    accountName,
  };

  const handleSubmit = async (values: FormValue) => {
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
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
            <QRCodeSVG
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
