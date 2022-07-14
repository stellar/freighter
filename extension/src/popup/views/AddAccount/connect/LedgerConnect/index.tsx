import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";
import { InfoBlock } from "@stellar/design-system";
import { WalletType } from "@shared/constants/hardwareWallet";

import { AppDispatch } from "popup/App";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Button } from "popup/basics/buttons/Button";
import Ledger from "popup/assets/ledger.png";
import LedgerConnected from "popup/assets/ledger-connected.png";
import { importHardwareWallet } from "popup/ducks/accountServices";
import { defaultStellarBipPath } from "popup/views/AddAccount/connect/PluginWallet";

import "./styles.scss";

export enum LEDGER_ERROR {
  NONE = "",
  NO_DEVICE = "NO_DEVICE",
  NOT_OPEN = "NOT_OPEN",
  OTHER = "OTHER",
}

export const parseLedgerError = (err: any): LEDGER_ERROR => {
  const { message } = err;
  if (!message) {
    return LEDGER_ERROR.OTHER;
  }
  if (message.indexOf("No device selected") > -1) {
    return LEDGER_ERROR.NO_DEVICE;
  }
  if (message.indexOf("Incorrect length")) {
    return LEDGER_ERROR.NOT_OPEN;
  }
  return LEDGER_ERROR.OTHER;
};

export const LedgerErrorBlock = ({ error }: { error: LEDGER_ERROR }) => {
  let errorMessage = "";
  switch (error) {
    case LEDGER_ERROR.NOT_OPEN:
      errorMessage = "Please select Stellar app and try again.";
      break;
    case LEDGER_ERROR.NO_DEVICE:
      errorMessage = "No device selected.";
      break;
    case LEDGER_ERROR.OTHER:
      errorMessage = "Error connecting. Please try again.";
      break;
    default:
      break;
  }

  if (!errorMessage) {
    return null;
  }
  return (
    <InfoBlock variant={InfoBlock.variant.warning}>{errorMessage}</InfoBlock>
  );
};

export const LedgerConnect = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();

  const [isDetecting, setIsDetecting] = useState(false);
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const bipPath = params.get("bipPath") || defaultStellarBipPath;

  const [ledgerConnectSuccessful, setLedgerConnectSuccessful] = useState(false);
  const [connectError, setConnectError] = useState<LEDGER_ERROR>(
    LEDGER_ERROR.NONE,
  );

  const handleConnect = async () => {
    setIsDetecting(true);
    setConnectError(LEDGER_ERROR.NONE);
    try {
      const transport = await TransportWebUSB.request();
      const ledgerApi = new LedgerApi(transport);
      const response = await ledgerApi.getPublicKey(bipPath);

      setLedgerConnectSuccessful(true);

      dispatch(
        importHardwareWallet({
          publicKey: response.publicKey,
          hardwareWalletType: WalletType.LEDGER,
          bipPath,
        }),
      );
    } catch (e) {
      setConnectError(parseLedgerError(e));
    }
    setIsDetecting(false);
  };

  const getLedgerButton = () => {
    if (ledgerConnectSuccessful) {
      return (
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => window.close()}
        >
          Done
        </Button>
      );
    }
    return (
      <Button
        fullWidth
        variant={Button.variant.tertiary}
        onClick={handleConnect}
        isLoading={isDetecting}
      >
        {isDetecting ? t("Detecting") : t("Detect device")}
      </Button>
    );
  };

  return (
    <>
      <FullscreenStyle />
      <div className="LedgerConnect">
        <div className="LedgerConnect__header">Connect Ledger</div>
        <div className="LedgerConnect__caption">
          {ledgerConnectSuccessful
            ? t("You’re good to go!")
            : t("Connect device to computer")}
        </div>
        <div className="LedgerConnect__content__center">
          <img
            className="LedgerConnect__img"
            src={ledgerConnectSuccessful ? LedgerConnected : Ledger}
            alt="ledger"
          />
        </div>

        <div className="LedgerConnect__bottom">
          <LedgerErrorBlock error={connectError} />
          {getLedgerButton()}
        </div>
      </div>
    </>
  );
};
