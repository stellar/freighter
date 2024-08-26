import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { View } from "popup/basics/layout/View";
import IconFail from "popup/assets/icon-fail.svg";

import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  resetSimulation,
  tokenSimulationSelector,
} from "popup/ducks/token-payment";
import "./styles.scss";

export const SettingsFail = () => {
  const dispatch = useDispatch();
  const { error } = useSelector(tokenSimulationSelector);
  const { t } = useTranslation();

  useEffect(() => {
    emitMetric(METRIC_NAMES.simuilateTokenPaymentError, { error });
  }, [error]);

  return (
    <React.Fragment>
      <View.AppHeader pageTitle={t("Error")} />
      <View.Content>
        <div className="SettingsFail__content">
          <div className="SettingsFail__amount">Simulation Rejected</div>
          <div className="SettingsFail__icon SettingsFail__fail">
            <img src={IconFail} alt="Icon Fail" />
          </div>
          <div className="SettingsFail__error-code"></div>
        </div>
        <div className="SettingsFail__error-block">{error?.errorMessage}</div>
      </View.Content>
      <View.Footer>
        <Button
          isFullWidth
          variant="secondary"
          size="md"
          onClick={() => {
            dispatch(resetSimulation());
            navigateTo(ROUTES.account);
          }}
        >
          {t("Got it")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
