import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Icon, Loader } from "@stellar/design-system";
import { handleSignedHwPayload } from "@shared/api/internal";
import { ConfigurableWalletType } from "@shared/constants/hardwareWallet";

import { POPUP_HEIGHT } from "constants/dimensions";

import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  bipPathSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
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
  MISMATCHED_HARDWARE_ACCOUNT_ERROR,
} from "popup/helpers/hardwareConnect";
import LedgerSigning from "popup/assets/ledger-signing.png";
import Ledger from "popup/assets/ledger.png";

import "./styles.scss";

export const HardwareSign = ({
  walletType,
  isSignSorobanAuthorization,
  isSignMessage,
  requestedPublicKey,
  onSubmit,
  isInternal = false,
  onCancel,
  uuid,
}: {
  walletType: ConfigurableWalletType;
  isSignSorobanAuthorization?: boolean;
  isSignMessage?: boolean;
  // The account the dApp asked to sign with, when it named one. Freighter falls
  // back to the active account if that account is not in the wallet, so this
  // cannot be inferred from redux — see the check in handleSign.
  requestedPublicKey?: string;
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
  const activePublicKey = useSelector(publicKeySelector);
  const [hardwareConnectSuccessful, setHardwareConnectSuccessful] =
    useState(false);
  const [hardwareWalletIsSigning, setHardwareWalletIsSigning] = useState(false);
  // Rendered whenever it is non-empty, including after the automatic signing
  // attempt that runs on mount — otherwise a device that fails immediately
  // leaves the overlay sitting on "Connect device to computer" with no reason.
  const [connectError, setConnectError] = useState("");

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

      // A transaction signed by the wrong device fails on its own — the
      // signature will not satisfy the transaction's source account. A
      // standalone message has no such binding, so the wrong key would hand
      // back a perfectly valid signature for an identity nobody approved, and
      // we would report it as authoritative. Refuse instead of signing.
      //
      // Compare against the requested account, not merely the active one:
      // signFlowAccountSelector silently leaves the previous account active
      // when the dApp names an account the wallet does not hold, so checking
      // the active account alone would pass in exactly that case.
      const expectedPublicKey = requestedPublicKey || activePublicKey;
      if (
        isSignMessage &&
        expectedPublicKey &&
        publicKey !== expectedPublicKey
      ) {
        throw new Error(MISMATCHED_HARDWARE_ACCOUNT_ERROR);
      }

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
          isSignMessage,
        }),
      );
      // should support saving signed xdr for SubmitTransaction to submit
      if (signWithHardwareWallet.fulfilled.match(res)) {
        if (shouldSubmit && !isSignSorobanAuthorization && !isSignMessage) {
          dispatch(
            saveSimulation({
              preparedTransaction: res.payload,
            }),
          );
        } else if (uuid) {
          // right now there are only two cases after signing,
          // submitting to network or handling in background script
          await handleSignedHwPayload({
            signedPayload: res.payload,
            signerAddress: publicKey,
            uuid,
          });
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

  // The device renders whatever it was handed, so the instruction has to match
  // it — telling someone to review a "transaction" while a SEP-53 message is on
  // screen is simply wrong.
  const reviewInstruction = isSignMessage
    ? t("Review message on device")
    : isSignSorobanAuthorization
      ? t("Review authorization on device")
      : t("Review transaction on device");

  // let's check connection on initial load
  useEffect(() => {
    // An XDR or a base64 auth entry is never empty, so their presence doubles as
    // "the payload has arrived". A SEP-53 message may legitimately be the empty
    // string, which would otherwise leave the overlay waiting on a device that
    // is already connected. The overlay only mounts once startHwSign has stored
    // the payload, so signing on mount is safe here.
    if (isSignMessage || transactionXDR) {
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
          customBackIcon={<Icon.X />}
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
                ? reviewInstruction
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
          {connectError && <WalletErrorBlock error={connectError} />}
          {!hardwareConnectSuccessful && (
            <Button
              data-testid="HardwareSign__detect-device-button"
              size="lg"
              variant="secondary"
              isFullWidth
              isRounded
              onClick={() => handleSign()}
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
          customBackIcon={<Icon.X />}
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
                ? reviewInstruction
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
          {connectError && <WalletErrorBlock error={connectError} />}
          {!hardwareConnectSuccessful && (
            <Button
              data-testid="HardwareSign__detect-device-button"
              size="md"
              variant="secondary"
              isFullWidth
              onClick={() => handleSign()}
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
