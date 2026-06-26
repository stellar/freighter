import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { Icon, Notification } from "@stellar/design-system";

import {
  AutoLockTimeoutMinutes,
  VALID_AUTO_LOCK_TIMEOUT_MINUTES,
  coerceAutoLockTimeoutMinutes,
  formatTimeoutLabel,
} from "@shared/constants/autoLock";
import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { Loading } from "popup/components/Loading";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import {
  autoLockTimeoutMinutesSelector,
  saveSettings,
  settingsSelector,
} from "popup/ducks/settings";

import "./styles.scss";

export const AutoLockTimer = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { state, fetchData } = useGetAppData();
  const currentTimeout = useSelector(autoLockTimeoutMinutesSelector);
  const settings = useSelector(settingsSelector);

  const [isSaving, setIsSaving] = useState(false);

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

  const handleSelect = async (minutes: AutoLockTimeoutMinutes) => {
    if (isSaving || minutes === currentTimeout) {
      return;
    }
    setIsSaving(true);
    await dispatch(
      saveSettings({
        isDataSharingAllowed: settings.isDataSharingAllowed ?? false,
        isMemoValidationEnabled: settings.isMemoValidationEnabled ?? true,
        isHideDustEnabled: settings.isHideDustEnabled ?? true,
        isOpenSidebarByDefault: settings.isOpenSidebarByDefault ?? false,
        autoLockTimeoutMinutes: minutes,
      }),
    );
    setIsSaving(false);
  };

  return (
    <React.Fragment>
      <SubviewHeader title={t("Auto-Lock timer")} />
      <View.Content hasNoTopPadding>
        <div className="AutoLockTimer">
          {VALID_AUTO_LOCK_TIMEOUT_MINUTES.map((minutes) => {
            const isSelected =
              coerceAutoLockTimeoutMinutes(currentTimeout) === minutes;
            return (
              <React.Fragment key={minutes}>
                <button
                  className={`AutoLockTimer__option${isSaving ? " AutoLockTimer__option--disabled" : ""}`}
                  onClick={() => handleSelect(minutes)}
                  disabled={isSaving}
                  aria-pressed={isSelected}
                  data-testid={`autoLockOption-${minutes}`}
                >
                  <span className="AutoLockTimer__option__label">
                    {formatTimeoutLabel(minutes, t)}
                  </span>
                  {isSelected && (
                    <Icon.Check className="AutoLockTimer__option__check" />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
