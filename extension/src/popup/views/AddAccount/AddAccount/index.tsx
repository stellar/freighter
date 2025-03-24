import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { emitMetric } from "helpers/metrics";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo } from "popup/helpers/navigate";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  addAccount,
  clearApiError,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";

export const AddAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const publicKey = useSelector(publicKeySelector);

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
    [dispatch, navigate]
  );

  const handleEnterPassword = async (password: string) => {
    await handleAddAccount(password);
  };

  useEffect(
    () => () => dispatch(clearApiError()) as unknown as void,
    [dispatch]
  );

  // Ask for user password in case it's not saved in current session store
  return (
    <React.Fragment>
      <SubviewHeader title="" />

      <EnterPassword
        accountAddress={publicKey}
        onConfirm={handleEnterPassword}
        confirmButtonTitle={t("Create New Address")}
      />
    </React.Fragment>
  );
};
