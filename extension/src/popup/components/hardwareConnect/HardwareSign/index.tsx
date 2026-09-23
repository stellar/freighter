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
  isDeviceRefusalError,
  MISMATCHED_HARDWARE_ACCOUNT_ERROR,
} from "popup/helpers/hardwareConnect";
import {
  emitSigningApproved,
  emitSigningFailed,
  emitSigningRejected,
  SigningKind,
  SigningSource,
} from "popup/metrics/signing";
import LedgerSigning from "popup/assets/ledger-signing.png";
import Ledger from "popup/assets/ledger.png";

import "./styles.scss";

export const HardwareSign = ({
  walletType,
  isSignSorobanAuthorization,
  isSignMessage,
  onSubmit,
  isInternal = false,
  onCancel,
  uuid,
  url,
}: {
  walletType: ConfigurableWalletType;
  isSignSorobanAuthorization?: boolean;
  isSignMessage?: boolean;
  onSubmit?: () => void;
  isInternal?: boolean;
  onCancel?: () => void;
  uuid?: string;
  /**
   * The requesting dApp's URL, threaded from the signing views so the signing
   * events carry the same `origin` the software-key path emits. Absent on the
   * internal (send/swap/trustline) flows, which have no dApp.
   */
  url?: string;
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

  // The overlay serves both the dApp signing prompts and the internal
  // send/swap/trustline flows. Both report signing, and `source` separates
  // them. A dApp request is the one that carries a `uuid` (the pending-request
  // id) and is not rendered inline as an internal step.
  const isDappSigningRequest = !isInternal && !!uuid;
  const signingSource: SigningSource = isDappSigningRequest
    ? SigningSource.DappApi
    : SigningSource.Internal;
  // An internal flow has no dApp, so it carries no origin.
  const signingProps = {
    source: signingSource,
    ...(isDappSigningRequest ? { url } : {}),
  };
  const signingKind: SigningKind = isSignMessage
    ? SigningKind.Message
    : isSignSorobanAuthorization
      ? SigningKind.AuthEntry
      : SigningKind.Transaction;

  // Mirrors the software path's error extraction (`action.error.message`).
  // Scrubbing and the "unknown" fallback belong to emitSigningFailed, so both
  // key types derive `reason_code` identically.
  const errorMessage = (e: unknown): string => {
    if (typeof e === "string") {
      // The rejected-thunk branch passes the message directly. Stringifying it
      // would wrap the reason code in quotes.
      return e;
    }
    if (e instanceof Error) {
      return e.message;
    }
    // `JSON.stringify` returns undefined for a value it cannot represent, so
    // fall back to the empty string. `emitSigningFailed` turns that into
    // "unknown".
    return JSON.stringify(e) ?? "";
  };

  /**
   * Reports a hardware signing error as either a rejection or a failure.
   *
   * Declining on the device is a user decision, so it lands on the same
   * `*_rejected` event as pressing reject in the popup — a rejection carries no
   * `reason_code`, because there is no fault to report. Everything else is a
   * runtime failure and keeps its scrubbed reason.
   */
  const emitSigningError = (e: unknown): void => {
    if (isDeviceRefusalError(e)) {
      emitSigningRejected(signingKind, signingProps);
      return;
    }
    emitSigningFailed(signingKind, errorMessage(e), signingProps);
  };

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
      // standalone message has no such binding, so a second attached Ledger
      // would hand back a perfectly valid signature while the popup says it is
      // signing as someone else. Refuse rather than let the UI lie.
      //
      // Scoped to the account the popup actually displays. Whether the dApp's
      // requested account was honoured is not decided here: signFlowAccountSelector
      // activates it when the wallet holds it and otherwise leaves the active
      // account alone, exactly as it does for software keys, and the true
      // signer goes back as `signerAddress` for the dApp to check. Comparing
      // against the raw request here would also dead-end any address the
      // selector cannot match — a muxed (M...) address whose base account is
      // the attached device, say — on an error telling the user to swap
      // hardware that was never the problem.
      if (isSignMessage && activePublicKey && publicKey !== activePublicKey) {
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
          // The internal branch: the device produced a signature and the flow
          // carries it to submission. This is where an internal hardware
          // signing succeeds — useSubmitTxData only receives the result, so it
          // cannot report it.
          emitSigningApproved(signingKind, signingProps);
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
            // Only the message path proves this key actually produced the
            // signature. `publicKey` was read over a connection that
            // hardwareSignMessage/hardwareSign then closed and reopened, so on
            // the transaction and auth-entry paths it is the key we asked
            // first, not necessarily the key that signed. Those signatures are
            // self-invalidating on the wrong key, so reporting nothing stays
            // truthful where reporting a guess would not.
            signerAddress: isSignMessage ? publicKey : undefined,
            uuid,
          });

          // Emitted here, not on signWithHardwareWallet.fulfilled: the software
          // path's approval event fires once the background has accepted the
          // signed payload and resolved the dApp's request, and that is what
          // handleSignedHwPayload just did. Emitting when the device returned a
          // signature would count an approval that never reached the dApp.
          if (isDappSigningRequest) {
            emitSigningApproved(signingKind, signingProps);
          }
        }
        closeOverlay();
        if (onSubmit) {
          onSubmit();
        }
      } else {
        setHardwareConnectSuccessful(false);
        emitSigningError(res.payload?.errorMessage);
        setConnectError(
          parseWalletError[walletType](res.payload?.errorMessage || ""),
        );
      }
      setHardwareWalletIsSigning(false);
    } catch (e) {
      setHardwareWalletIsSigning(false);
      // Covers every throw in the block above: the user declining on the
      // device, no device attached, the mismatched-account refusal, and a
      // handleSignedHwPayload failure after a good signature. emitSigningError
      // splits the decline (a user decision) from the rest (runtime failures).
      emitSigningError(e);
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
          title={t("Connect {{walletType}}", { walletType })}
        />
        <div className="HardwareSign__content">
          <div className="HardwareSign__success">
            {hardwareConnectSuccessful ? t("Connected") : ""}
          </div>
          <div className="HardwareSign__content__center">
            <img
              className="HardwareSign__img"
              src={hardwareConnectSuccessful ? LedgerSigning : Ledger}
              alt={t("Connect {{walletType}}", { walletType })}
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
          title={t("Connect {{walletType}}", { walletType })}
        />
        <div className="HardwareSign__content">
          <div className="HardwareSign__success">
            {hardwareConnectSuccessful ? t("Connected") : ""}
          </div>
          <div className="HardwareSign__content__center">
            <img
              className="HardwareSign__img"
              src={hardwareConnectSuccessful ? LedgerSigning : Ledger}
              alt={t("Connect {{walletType}}", { walletType })}
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
