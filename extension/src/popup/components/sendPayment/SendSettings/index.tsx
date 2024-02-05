import React from "react";
import { useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";

import { tokenSimulationStatusSelector } from "popup/ducks/token-payment";
import { ROUTES } from "popup/constants/routes";

import { Settings } from "./Settings";
import { SettingsFail } from "./SettingsFail";

export const SendSettings = ({
  previous,
  next,
}: {
  previous: ROUTES;
  next: ROUTES;
}) => {
  const simStatus = useSelector(tokenSimulationStatusSelector);

  const render = () => {
    switch (simStatus) {
      case ActionStatus.IDLE:
      case ActionStatus.PENDING:
        return <Settings previous={previous} next={next} />;
      case ActionStatus.ERROR:
        return <SettingsFail />;
      default:
        return <Settings previous={previous} next={next} />;
    }
  };

  return render();
};
