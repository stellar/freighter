import React from "react";

import { Settings } from "./Settings";
import { SettingsFail } from "./SettingsFail";
import { TransactionData } from "types/transactions";
import { RequestState, State } from "constants/request";
import { GetSettingsData } from "popup/views/SendPayment/hooks/useGetSettingsData";

interface SendSettings {
  goBack: () => void;
  goToNext: () => void;
  goToTimeoutSetting: () => void;
  goToFeeSetting: () => void;
  goToSlippageSetting: () => void;
  transactionData: TransactionData;
  settingsData: State<GetSettingsData, unknown>;
  fetchData: () => Promise<GetSettingsData | Error>;
  isPathPayment: boolean;
  setMemo: (memo: string | undefined) => void;
}
export const SendSettings = ({
  goBack,
  goToNext,
  goToTimeoutSetting,
  goToFeeSetting,
  goToSlippageSetting,
  setMemo,
  transactionData,
  settingsData,
  isPathPayment,
  fetchData,
}: SendSettings) => {
  const render = () => {
    switch (settingsData.state) {
      case RequestState.ERROR:
        return <SettingsFail />;
      default:
      case RequestState.IDLE:
      case RequestState.LOADING:
        return (
          <Settings
            goBack={goBack}
            goToNext={goToNext}
            goToFeeSetting={goToFeeSetting}
            goToSlippageSetting={goToSlippageSetting}
            goToTimeoutSetting={goToTimeoutSetting}
            setMemo={setMemo}
            transactionData={transactionData}
            isPathPayment={isPathPayment}
            settingsData={settingsData}
            fetchData={fetchData}
          />
        );
    }
  };

  return render();
};
