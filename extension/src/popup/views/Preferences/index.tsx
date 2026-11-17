import React, { useEffect, useSyncExternalStore } from "react";
import {
  Icon,
  Notification,
  RadioButton,
  Toggle,
} from "@stellar/design-system";
import { Field, Form, Formik } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { AppDispatch } from "popup/App";
import {
  autoLockTimeoutMinutesSelector,
  saveSettings,
} from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AutoSaveFields } from "popup/components/AutoSave";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { closeWindow, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Navigate, useLocation } from "react-router-dom";
import { reRouteOnboarding } from "popup/helpers/route";
import { THEME_PREFERENCES, ThemePreference } from "@shared/constants/theme";
import {
  getThemePreferenceInEffect,
  subscribeToThemePreference,
} from "popup/helpers/systemTheme";
import { selectThemePreference } from "popup/helpers/themePreference";
import { PRIVACY_POLICY_URL } from "popup/constants/externalLinks";

import "./styles.scss";

export const Preferences = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { state, fetchData } = useGetAppData();
  const autoLockTimeoutMinutes = useSelector(autoLockTimeoutMinutesSelector);
  const themePreference = useSyncExternalStore(
    subscribeToThemePreference,
    getThemePreferenceInEffect,
  );

  const themeLabels: Record<ThemePreference, string> = {
    system: t("Auto(System)"),
    light: t("Light"),
    dark: t("Dark"),
  };

  const handleThemeChange = async (preference: ThemePreference) => {
    try {
      await selectThemePreference(preference);
    } catch (e) {
      console.error("Failed to save theme preference:", e);
    }
  };

  interface SettingValues {
    isValidatingMemoValue: boolean;
    isDataSharingAllowedValue: boolean;
    isHideDustEnabledValue: boolean;
    isOpenSidebarByDefaultValue: boolean;
  }

  const handleSubmit = async (formValue: SettingValues) => {
    const {
      isValidatingMemoValue,
      isDataSharingAllowedValue,
      isHideDustEnabledValue,
      isOpenSidebarByDefaultValue,
    } = formValue;

    await dispatch(
      saveSettings({
        isMemoValidationEnabled: isValidatingMemoValue,
        isDataSharingAllowed: isDataSharingAllowedValue,
        isHideDustEnabled: isHideDustEnabledValue,
        isOpenSidebarByDefault: isOpenSidebarByDefaultValue,
        autoLockTimeoutMinutes,
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
      closeWindow();
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

  const {
    isMemoValidationEnabled,
    isDataSharingAllowed,
    isHideDustEnabled,
    isOpenSidebarByDefault,
  } = state.data.settings;

  const initialValues: SettingValues = {
    isValidatingMemoValue: isMemoValidationEnabled,
    isDataSharingAllowedValue: isDataSharingAllowed,
    isHideDustEnabledValue: isHideDustEnabled,
    isOpenSidebarByDefaultValue: isOpenSidebarByDefault ?? false,
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
          <Form>
            <AutoSaveFields />
            <div className="Preferences__section">
              <div className="Preferences__section__label" id="theme-label">
                {t("Display")}
              </div>
              <div className="Preferences__card">
                <div
                  className="Preferences__options"
                  role="radiogroup"
                  aria-labelledby="theme-label"
                >
                  {THEME_PREFERENCES.map((preference) => (
                    <RadioButton
                      key={preference}
                      id={`themeOption-${preference}`}
                      data-testid={`themeOption-${preference}`}
                      name="themePreference"
                      value={preference}
                      label={themeLabels[preference]}
                      fieldSize="lg"
                      checked={themePreference === preference}
                      onChange={() => handleThemeChange(preference)}
                    />
                  ))}
                </div>

                {typeof globalThis.chrome?.sidePanel?.open === "function" && (
                  <>
                    <div className="Preferences__divider" />

                    <div className="Preferences__setting">
                      <div className="Preferences__setting__text">
                        <div className="Preferences__setting__title">
                          {t("Open in sidebar by default")}
                        </div>
                        <div className="Preferences__setting__description">
                          {t(
                            "Open Varial in the sidebar when clicking the extension icon.",
                          )}
                        </div>
                      </div>
                      <Toggle
                        fieldSize="sm"
                        checked={initialValues.isOpenSidebarByDefaultValue}
                        customInput={<Field />}
                        id="isOpenSidebarByDefaultValue"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="Preferences__section">
              <div className="Preferences__section__label">{t("Security")}</div>
              <div className="Preferences__card">
                <div className="Preferences__setting">
                  <div className="Preferences__setting__text">
                    <div className="Preferences__setting__title">
                      {t("Hide small payments")}
                    </div>
                    <div className="Preferences__setting__description">
                      {t("Hide payments below 0.1 XLM.")}
                    </div>
                  </div>
                  <Toggle
                    fieldSize="sm"
                    checked={initialValues.isHideDustEnabledValue}
                    customInput={<Field />}
                    id="isHideDustEnabledValue"
                  />
                </div>

                <div className="Preferences__divider" />

                <div className="Preferences__setting">
                  <div className="Preferences__setting__text">
                    <div className="Preferences__setting__title">
                      {t("Verify addresses")}
                    </div>
                    <div className="Preferences__setting__description">
                      {t("Check memo requirements with stellar.expert.")}
                    </div>
                  </div>
                  <div data-testid="isValidatingMemoValue">
                    <Toggle
                      fieldSize="sm"
                      checked={initialValues.isValidatingMemoValue}
                      customInput={<Field />}
                      id="isValidatingMemoValue"
                    />
                  </div>
                </div>

                <div className="Preferences__divider" />

                <div className="Preferences__setting">
                  <div className="Preferences__setting__text">
                    <div className="Preferences__setting__title">
                      {t("Share analytics data")}
                    </div>
                    <div className="Preferences__setting__description">
                      {t(
                        "Help improve Varial by sharing usage and diagnostic data.",
                      )}
                    </div>
                    <a
                      className="Preferences__setting__link"
                      href={PRIVACY_POLICY_URL}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="privacyPolicyLink"
                    >
                      {t("Learn more about data sharing")}
                      <Icon.LinkExternal01 />
                    </a>
                  </div>
                  <Toggle
                    fieldSize="sm"
                    checked={initialValues.isDataSharingAllowedValue}
                    customInput={<Field />}
                    id="isDataSharingAllowedValue"
                  />
                </div>
              </div>
            </div>
          </Form>
        </View.Content>
      </Formik>
    </React.Fragment>
  );
};
