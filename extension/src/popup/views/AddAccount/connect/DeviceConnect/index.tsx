import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, Notification } from "@stellar/design-system";
import { ConfigurableWalletType } from "@shared/constants/hardwareWallet";

import { AppDispatch } from "popup/App";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import { importHardwareWallet } from "popup/ducks/accountServices";
import { defaultStellarBipPath } from "popup/views/AddAccount/connect/PluginWallet";
import {
  createWalletConnection,
  parseWalletError,
} from "popup/helpers/hardwareConnect";
import Ledger from "popup/assets/ledger.png";
import LedgerConnected from "popup/assets/ledger-connected.png";

import "./styles.scss";

export const WalletErrorBlock = ({ error }: { error: string }) => {
  const { t } = useTranslation();

  if (!error) {
    return null;
  }
  return (
    <Notification variant="error" title="Error">
      {t(error)}
    </Notification>
  );
};

export const DeviceConnect = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();

  const [isDetecting, setIsDetecting] = useState(false);
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const bipPath = params.get("bipPath") || defaultStellarBipPath;
  const walletType = params.get("walletType") as ConfigurableWalletType;

  const [walletConnectSuccessful, setWalletConnectSuccessful] = useState(false);
  const [connectError, setConnectError] = useState("");

  const handleConnect = async () => {
    setIsDetecting(true);
    setConnectError("");
    try {
      const publicKey = await createWalletConnection[walletType](bipPath);

      setWalletConnectSuccessful(true);

      dispatch(
        importHardwareWallet({
          publicKey,
          hardwareWalletType: walletType,
          bipPath,
        }),
      );
    } catch (e) {
      if (parseWalletError.hasOwnProperty(walletType)) {
        const isErrorParserFunction =
          typeof parseWalletError[walletType] === "function";
        if (isErrorParserFunction) {
          setConnectError(parseWalletError[walletType](e));
        }
      }
    }
    setIsDetecting(false);
  };

  const getWalletButton = () => {
    if (walletConnectSuccessful) {
      return (
        <Button
          size="md"
          isFullWidth
          variant="secondary"
          onClick={() => window.close()}
        >
          Done
        </Button>
      );
    }
    return (
      <Button
        size="md"
        isFullWidth
        variant="secondary"
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
      <div className="DeviceConnect">
        <div className="DeviceConnect__header">Connect {walletType}</div>
        <div className="DeviceConnect__caption">
          {walletConnectSuccessful
            ? t("You’re good to go!")
            : t("Connect device to computer")}
        </div>
        <div className="DeviceConnect__content__center">
          <img
            className="DeviceConnect__img"
            src={walletConnectSuccessful ? LedgerConnected : Ledger}
            alt={walletType}
          />
        </div>

        <div className="DeviceConnect__bottom">
          {connectError ? <WalletErrorBlock error={connectError} /> : null}
          {getWalletButton()}
        </div>
      </div>
    </>
  );
};
