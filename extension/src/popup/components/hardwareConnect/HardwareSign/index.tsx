import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Icon, Loader } from "@stellar/design-system";
import { handleSignedHwPayload } from "@shared/api/internal";
import { ConfigurableWalletType } from "@shared/constants/hardwareWallet";

import { POPUP_HEIGHT } from "constants/dimensions";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { bipPathSelector } from "popup/ducks/accountServices";
import { settingsSelector } from "popup/ducks/settings";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { WalletErrorBlock } from "popup/views/AddAccount/connect/DeviceConnect";

import { useIsSwap } from "popup/helpers/useIsSwap";
import {
  getWalletPublicKey,
  parseWalletError,
} from "popup/helpers/hardwareConnect";
import LedgerSigning from "popup/assets/ledger-signing.png";
import Ledger from "popup/assets/ledger.png";

import "./styles.scss";

export const HardwareSign = ({
  walletType,
  isSignSorobanAuthorization,
  transactionXDR,
  shouldSubmit,
  destination,
  onClose,
}: {
  walletType: ConfigurableWalletType;
  isSignSorobanAuthorization?: boolean;
  transactionXDR: string;
  shouldSubmit: boolean;
  destination: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { networkDetails, isHashSigningEnabled } =
    useSelector(settingsSelector);
  const bipPath = useSelector(bipPathSelector);
  const [isDetectBtnDirty, setIsDetectBtnDirty] = useState(false);

  const closeOverlay = () => {
    if (hardwareConnectRef.current) {
      hardwareConnectRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    onClose();
  };

  // animate entry
  const hardwareConnectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hardwareConnectRef.current) {
      hardwareConnectRef.current.style.bottom = "0";
    }
  }, [hardwareConnectRef]);

  const handleSign = async () => {};

  // let's check connection on initial load
  useEffect(() => {
    handleSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="HardwareSign">
      <div className="HardwareSign__wrapper" ref={hardwareConnectRef}>
        <SubviewHeader
          customBackAction={closeOverlay}
          customBackIcon={<Icon.XClose />}
          title={`Connect ${walletType}`}
        />
        <div className="HardwareSign__content">
          <div className="HardwareSign__success">
            {hardwareConnectSuccessful ? "Connected" : ""}
          </div>
          <div className="HardwareSign__content__center">
            <img
              className="HardwareSign__img"
              src={hardwareConnectSuccessful ? LedgerSigning : Ledger}
              alt={walletType}
            />
            <span>
              {hardwareConnectSuccessful
                ? t("Review transaction on device")
                : t("Connect device to computer")}
            </span>
            {hardwareWalletIsSigning && (
              <div className="HardwareSign__loader">
                <Loader size="2rem" />
              </div>
            )}
          </div>
        </div>
        <div className="HardwareSign__bottom">
          {isDetectBtnDirty && <WalletErrorBlock error={connectError} />}
          {!hardwareConnectSuccessful && (
            <Button
              size="md"
              variant="secondary"
              isFullWidth
              onClick={() => {
                setIsDetectBtnDirty(true);
                handleSign();
              }}
              isLoading={isDetecting}
            >
              {isDetecting ? t("Detecting") : t("Detect device")}
            </Button>
          )}
        </div>
      </div>
      <LoadingBackground onClick={undefined} isActive={true} />
    </div>
  );
};
