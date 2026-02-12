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
import {
  signWithHardwareWallet,
  transactionSubmissionSelector,
  closeHwOverlay,
  saveSimulation,
} from "popup/ducks/transactionSubmission";
import { settingsSelector } from "popup/ducks/settings";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { WalletErrorBlock } from "popup/views/AddAccount/connect/DeviceConnect";

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
  onSubmit,
  isInternal = false,
  onCancel,
  uuid,
}: {
  walletType: ConfigurableWalletType;
  isSignSorobanAuthorization?: boolean;
  onSubmit?: () => void;
  isInternal?: boolean;
  onCancel?: () => void;
  uuid?: string;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [isDetecting, setIsDetecting] = useState(false);
  const { networkDetails, isHashSigningEnabled } =
    useSelector(settingsSelector);
  const {
    hardwareWalletData: { transactionXDR, shouldSubmit },
  } = useSelector(transactionSubmissionSelector);
  const bipPath = useSelector(bipPathSelector);
  const [hardwareConnectSuccessful, setHardwareConnectSuccessful] =
    useState(false);
  const [hardwareWalletIsSigning, setHardwareWalletIsSigning] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [isDetectBtnDirty, setIsDetectBtnDirty] = useState(false);

  const closeOverlay = () => {
    if (hardwareConnectRef.current) {
      hardwareConnectRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    setTimeout(() => {
      dispatch(closeHwOverlay());
    }, 300);
  };

  // animate entry
  const hardwareConnectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (hardwareConnectRef.current) {
      hardwareConnectRef.current.style.bottom = "0";
    }
  }, [hardwareConnectRef]);

  const handleSign = async () => {
    setIsDetecting(true);
    setConnectError("");
    try {
      const publicKey = await getWalletPublicKey[walletType](bipPath);
      setHardwareConnectSuccessful(true);
      setHardwareWalletIsSigning(true);

      const res = await dispatch(
        signWithHardwareWallet({
          transactionXDR,
          networkPassphrase: networkDetails.networkPassphrase,
          publicKey,
          bipPath,
          walletType,
          isHashSigningEnabled,
          isSignSorobanAuthorization,
        }),
      );
      // should support saving signed xdr for SubmitTransaction to submit
      if (signWithHardwareWallet.fulfilled.match(res)) {
        if (shouldSubmit && !isSignSorobanAuthorization) {
          dispatch(
            saveSimulation({
              preparedTransaction: res.payload,
            }),
          );
        } else if (uuid) {
          // right now there are only two cases after signing,
          // submitting to network or handling in background script
          await handleSignedHwPayload({ signedPayload: res.payload, uuid });
        }
        closeOverlay();
        if (onSubmit) {
          onSubmit();
        }
      } else {
        setHardwareConnectSuccessful(false);
        setConnectError(
          parseWalletError[walletType](res.payload?.errorMessage || ""),
        );
      }
      setHardwareWalletIsSigning(false);
    } catch (e) {
      setHardwareWalletIsSigning(false);
      setConnectError(parseWalletError[walletType](e));
    }
    setIsDetecting(false);
  };

  // let's check connection on initial load
  useEffect(() => {
    if (transactionXDR) {
      handleSign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionXDR]);

  return isInternal ? (
    <div
      className="HardwareSign__internal"
      ref={hardwareConnectRef}
      data-testid="HardwareSign__internal"
    >
      <div className="HardwareSign__internal__wrapper">
        <SubviewHeader
          customBackAction={() => {
            closeOverlay();
            if (onCancel) {
              onCancel();
            }
          }}
          customBackIcon={<Icon.XClose />}
          title={t("Connect {walletType}", { walletType })}
        />
        <div className="HardwareSign__content">
          <div className="HardwareSign__success">
            {hardwareConnectSuccessful ? t("Connected") : ""}
          </div>
          <div className="HardwareSign__content__center">
            <img
              className="HardwareSign__img"
              src={hardwareConnectSuccessful ? LedgerSigning : Ledger}
              alt={t("Connect {walletType}", { walletType })}
            />
            <span data-testid="HardwareSign__connect-text">
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
              data-testid="HardwareSign__detect-device-button"
              size="lg"
              variant="secondary"
              isFullWidth
              isRounded
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
    </div>
  ) : (
    <div className="HardwareSign">
      <div className="HardwareSign__wrapper" ref={hardwareConnectRef}>
        <SubviewHeader
          customBackAction={closeOverlay}
          customBackIcon={<Icon.XClose />}
          title={t("Connect {walletType}", { walletType })}
        />
        <div className="HardwareSign__content">
          <div className="HardwareSign__success">
            {hardwareConnectSuccessful ? t("Connected") : ""}
          </div>
          <div className="HardwareSign__content__center">
            <img
              className="HardwareSign__img"
              src={hardwareConnectSuccessful ? LedgerSigning : Ledger}
              alt={t("Connect {walletType}", { walletType })}
            />
            <span data-testid="HardwareSign__connect-text">
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
              data-testid="HardwareSign__detect-device-button"
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
