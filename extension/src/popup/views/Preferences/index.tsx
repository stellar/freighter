import React, { useEffect } from "react";
import { Notification, Toggle } from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { AppDispatch } from "popup/App";
import { saveSettings } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { reRouteOnboarding } from "popup/helpers/route";

import "./styles.scss";

export const Preferences = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { state, fetchData } = useGetAppData();

  interface SettingValues {
    isValidatingMemoValue: boolean;
    isDataSharingAllowedValue: boolean;
    isHideDustEnabledValue: boolean;
  }

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isValidatingMemoValue,
      isDataSharingAllowedValue,
      isHideDustEnabledValue,
    } = formValue;

    await dispatch(
      saveSettings({
        isMemoValidationEnabled: isValidatingMemoValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isHideDustEnabled: isHideDustEnabledValue,
      }),
    );
  };

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

  const { isMemoValidationEnabled, isDataSharingAllowed, isHideDustEnabled } =
    state.data.settings;

  const initialValues: SettingValues = {
    isValidatingMemoValue: isMemoValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isHideDustEnabledValue: isHideDustEnabled,
  };

  return (
    <React.Fragment>
      <SubviewHeader title={t("Preferences")} />
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        <View.Content hasNoTopPadding>
          <div className="Preferences">
            <Form>
              <AutoSaveFields />
              <div className="Preferences--section">
                <div className="Preferences--section--title">
                  <span>{t("Verification with")} stellar.expert</span>
                  <div
                    className="Preferences--toggle"
                    data-testid="isValidatingMemoValue"
                  >
                    <Toggle
                      fieldSize="sm"
                      checked={initialValues.isValidatingMemoValue}
                      customInput={<Field />}
                      id="isValidatingMemoValue"
                    />
                  </div>
                </div>
                <span className="Preferences--section--subtitle">
                  {t("Validate addresses that require a memo")}
                </span>
              </div>

              <div className="Preferences--section">
                <div className="Preferences--section--title">
                  <span>{t("Anonymous data sharing")} </span>
                  <div className="Preferences--toggle">
                    <Toggle
                      fieldSize="sm"
                      checked={initialValues.isDataSharingAllowedValue}
                      customInput={<Field />}
                      id="isDataSharingAllowedValue"
                    />
                  </div>
                </div>
                <span className="Preferences--section--subtitle">
                  {`${t(
                    "Allow Freighter to collect anonymous information about usage.",
                  )} ${t(
                    "Freighter will never collect your personal information such as IP address, keys, balance or transaction amounts.",
                  )}`}
                </span>
              </div>

              <div className="Preferences--section">
                <div className="Preferences--section--title">
                  <span>{t("Hide small payments")} </span>
                  <div className="Preferences--toggle">
                    <Toggle
                      fieldSize="sm"
                      checked={initialValues.isHideDustEnabledValue}
                      customInput={<Field />}
                      id="isHideDustEnabledValue"
                    />
                  </div>
                </div>
                <span className="Preferences--section--subtitle">
                  {t("Hide payments smaller than 0.1 XLM")}
                </span>
              </div>
            </Form>
          </div>
        </View.Content>
      </Formik>
    </React.Fragment>
  );
};
