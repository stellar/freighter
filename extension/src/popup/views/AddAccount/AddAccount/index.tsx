import React, { useCallback, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";

import { emitMetric } from "helpers/metrics";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { addAccount, clearApiError } from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { Notification } from "@stellar/design-system";
import { newTabHref } from "helpers/urls";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

export const AddAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const { state, fetchData } = useGetAppData();

  const handleAddAccount = useCallback(
    async (password: string = "") => {
      const res = await dispatch(addAccount({ password }));

      if (addAccount.fulfilled.match(res)) {
        emitMetric(METRIC_NAMES.accountScreenAddAccount, {
          number_of_accounts: res.payload.allAccounts.length,
        });
        navigateTo(ROUTES.account, navigate);
      }
    },
    [dispatch, navigate],
  );

  const handleEnterPassword = async (password: string) => {
    await handleAddAccount(password);
  };

  useEffect(
    () => () => dispatch(clearApiError()) as unknown as void,
    [dispatch],
  );

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

  if (state.data?.type === "re-route") {
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

  if (
    state.data.type === "resolved" &&
    (state.data.account.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      state.data.account.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const data = state.data;

  // Ask for user password in case it's not saved in current session store
  return (
    <React.Fragment>
      <SubviewHeader title="" />

      <EnterPassword
        accountAddress={data.account.publicKey}
        onConfirm={handleEnterPassword}
        confirmButtonTitle={t("Create New Address")}
      />
    </React.Fragment>
  );
};
