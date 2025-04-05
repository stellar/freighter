import React from "react";
import { useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";

import { tokenSimulationStatusSelector } from "popup/ducks/token-payment";

import { Settings } from "./Settings";
import { SettingsFail } from "./SettingsFail";

export const SendSettings = ({
  goBack,
  goToNext,
  goToTimeoutSetting,
  goToFeeSetting,
  goToSlippageSetting,
}: {
  goBack: () => void;
  goToNext: () => void;
  goToTimeoutSetting: () => void;
  goToFeeSetting: () => void;
  goToSlippageSetting: () => void;
}) => {
  const simStatus = useSelector(tokenSimulationStatusSelector);

  const render = () => {
    switch (simStatus) {
      case ActionStatus.ERROR:
        return <SettingsFail />;
      default:
      case ActionStatus.IDLE:
      case ActionStatus.PENDING:
        return (
          <Settings
            goBack={goBack}
            goToNext={goToNext}
            goToTimeoutSetting={goToTimeoutSetting}
            goToFeeSetting={goToFeeSetting}
            goToSlippageSetting={goToSlippageSetting}
          />
        );
    }
  };

  return render();
};
