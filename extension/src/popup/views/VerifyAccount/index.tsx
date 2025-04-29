import get from "lodash/get";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate, useLocation, Navigate } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { confirmPassword } from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";

import "./styles.scss";
import { AppDispatch } from "popup/App";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { Notification } from "@stellar/design-system";
import { newTabHref } from "helpers/urls";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

interface VerifyAccountProps {
  isApproval?: boolean;
  customBackAction?: () => void;
  customSubmit?: (password: string) => Promise<void>;
}

export const VerifyAccount = ({
  isApproval,
  customBackAction,
  customSubmit,
}: VerifyAccountProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { state, fetchData } = useGetAppData();

  const from = get(location, "state.from.pathname", "") as ROUTES;

  const navigate = useNavigate();

  const handleConfirm = async (password: string) => {
    if (customSubmit) {
      await customSubmit(password);
    } else {
      await dispatch(confirmPassword(password));
      navigateTo(from || ROUTES.account, navigate);
    }
  };

  const handleCancel = () => {
    if (customBackAction) {
      customBackAction();
      return;
    }

    navigate(-1);
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

  const { publicKey } = state.data.account;

  return (
    <React.Fragment>
      <div className="VerifyAccount">
        <EnterPassword
          accountAddress={publicKey}
          description={
            isApproval
              ? undefined
              : t("Enter your account password to authorize this transaction.")
          }
          confirmButtonTitle={isApproval ? undefined : t("Submit")}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      </div>
    </React.Fragment>
  );
};
