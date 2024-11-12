import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import {
  addAccount,
  authErrorSelector,
  clearApiError,
} from "popup/ducks/accountServices";
import { Loading } from "popup/components/Loading";
import { AppError } from "popup/components/AppError";
import { SubviewHeader } from "popup/components/SubviewHeader";

import { emitMetric } from "helpers/metrics";

import "./styles.scss";

export const AddAccount = () => {
  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  useEffect(() => {
    const handleSubmit = async () => {
      const res = await dispatch(addAccount());

      if (addAccount.fulfilled.match(res)) {
        emitMetric(METRIC_NAMES.accountScreenAddAccount, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          number_of_accounts: res.payload.allAccounts.length,
        });
        navigateTo(ROUTES.account);
      }
    };

    handleSubmit();
  }, [dispatch]);

  useEffect(
    () => () => dispatch(clearApiError()) as unknown as void,
    [dispatch],
  );

  return (
    <React.Fragment>
      <SubviewHeader title="" />
      {!authError && <Loading />}
      {authError && <AppError>{authError}</AppError>}
    </React.Fragment>
  );
};
