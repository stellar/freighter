import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { isAccountMismatchSelector } from "popup/ducks/accountServices";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { truncatedPublicKey } from "helpers/stellar";
import { View } from "popup/basics/layout/View";
import { useGetAccountMismatchData } from "./hooks/useGetAccountMismatchData";
import { RequestState } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Loading } from "../Loading";

import "./styles.scss";
import { AppDataType } from "helpers/hooks/useGetAppData";

export const AccountMismatch = () => {
  const { t } = useTranslation();
  const isAccountMismatch = useSelector(isAccountMismatchSelector);
  const { state: accountData, fetchData } = useGetAccountMismatchData();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    accountData.state === RequestState.IDLE ||
    accountData.state === RequestState.LOADING
  ) {
    return <Loading />;
  }
  const hasError = accountData.state === RequestState.ERROR;

  if (
    !hasError &&
    accountData.data.type === "resolved" &&
    (accountData.data.applicationState === APPLICATION_STATE.PASSWORD_CREATED ||
      accountData.data.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  if (isAccountMismatch && accountData.data?.type === AppDataType.RESOLVED) {
    const publicKey = accountData.data?.publicKey!;
    return createPortal(
      <>
        <div
          className="AccountMismatch__notification"
          data-testid="account-mismatch"
        >
          <View.Content hasNoTopPadding hasNoBottomPadding>
            <div className="AccountMismatch__notification__content">
              <div>
                <Notification
                  title={t(
                    `Your session with the public key ${truncatedPublicKey(
                      publicKey,
                    )} has ended. Please refresh the browser.`,
                  )}
                  variant="warning"
                />
              </div>
            </div>
          </View.Content>
        </div>
        <LoadingBackground isActive isFullScreen isOpaque />,
      </>,

      document.querySelector("#modal-root")!,
    );
  }

  return null;
};
