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
  authErrorSelector,
  clearApiError,
  hasPrivateKeySelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";

export const AddAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);
  const publicKey = useSelector(publicKeySelector);
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  // In case a password is not provided here popupMessageListener/addAccount
  // will try to use the existing password value saved in the session store
  const handleAddAccount = useCallback(
    async (password: string = "") => {
      const res = await dispatch(addAccount(password));

      if (addAccount.fulfilled.match(res)) {
        emitMetric(METRIC_NAMES.accountScreenAddAccount, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          number_of_accounts: res.payload.allAccounts.length,
        });
        navigateTo(ROUTES.account, navigate);
      }
    },
    [dispatch],
  );

  const handleEnterPassword = async (password: string) => {
    await handleAddAccount(password);
  };

  // If we have a private key we can assume the user password is also saved in
  // the current session store, so no need to ask for it again
  useEffect(() => {
    if (hasPrivateKey) {
      handleAddAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => dispatch(clearApiError()) as unknown as void,
    [dispatch],
  );

  // No need to ask for password if it's already stored, so let's just briefly
  // wait until user is navigated to the next screen
  if (hasPrivateKey && !authError) {
    return null;
  }

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
