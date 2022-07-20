import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";
import { Icon } from "@stellar/design-system";
import { handleSignedHwTransaction } from "@shared/api/internal";

import { POPUP_HEIGHT } from "constants/dimensions";

import { AppDispatch } from "popup/App";
import { Button } from "popup/basics/buttons/Button";
import { SubviewHeader } from "popup/components/SubviewHeader";
import Ledger from "popup/assets/ledger.png";
import LedgerSigning from "popup/assets/ledger-signing.png";
import { bipPathSelector } from "popup/ducks/accountServices";
import {
  signWithLedger,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  closeHwOverlay,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import {
  LEDGER_ERROR,
  parseLedgerError,
  LedgerErrorBlock,
} from "popup/views/AddAccount/connect/LedgerConnect";

import "./styles.scss";

export const LedgerSign = () => {
  const dispatch: AppDispatch = useDispatch();
  const { t } = useTranslation();
  const [isDetecting, setIsDetecting] = useState(false);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    hardwareWalletData: { transactionXDR, shouldSubmit },
  } = useSelector(transactionSubmissionSelector);
  const bipPath = useSelector(bipPathSelector);
  const [ledgerConnectSuccessful, setLedgerConnectSuccessful] = useState(false);
  const [connectError, setConnectError] = useState<LEDGER_ERROR>(
    LEDGER_ERROR.NONE,
  );

  const closeOverlay = () => {
    if (ledgerConnectRef.current) {
      ledgerConnectRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    setTimeout(() => {
      dispatch(closeHwOverlay());
    }, 300);
  };

  // animate entry
  const ledgerConnectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ledgerConnectRef.current) {
      ledgerConnectRef.current.style.bottom = "0";
    }
  }, [ledgerConnectRef]);

  const handleSign = async () => {
    setIsDetecting(true);
    setConnectError(LEDGER_ERROR.NONE);
    try {
      const transport = await TransportWebUSB.create();
      const ledgerApi = new LedgerApi(transport);
      const response = await ledgerApi.getPublicKey(bipPath);
      setLedgerConnectSuccessful(true);

      const res = await dispatch(
        signWithLedger({
          transactionXDR: transactionXDR as string,
          networkPassphrase: networkDetails.networkPassphrase,
          publicKey: response.publicKey,
          bipPath,
        }),
      );
      if (signWithLedger.fulfilled.match(res)) {
        if (shouldSubmit) {
          dispatch(
            submitFreighterTransaction({
              signedXDR: res.payload,
              networkDetails,
            }),
          );
        } else {
          // right now there are only two cases after signing,
          // submitting to network or handling in background script
          await handleSignedHwTransaction({ signedTransaction: res.payload });
        }
        closeOverlay();
      } else {
        setLedgerConnectSuccessful(false);
        setConnectError(parseLedgerError(res.payload?.errorMessage || ""));
      }
    } catch (e) {
      setConnectError(parseLedgerError(e));
    }
    setIsDetecting(false);
  };

  // let's check connection on initial load
  useEffect(() => {
    handleSign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="LedgerSign">
      <div className="LedgerSign__wrapper" ref={ledgerConnectRef}>
        <SubviewHeader
          customBackAction={closeOverlay}
          customBackIcon={<Icon.X />}
          title="Connect Ledger"
        />
        <div className="LedgerSign__content">
          <div className="LedgerSign__success">
            {ledgerConnectSuccessful ? "Connected" : ""}
          </div>
          <div className="LedgerSign__content__center">
            <img
              className="LedgerSign__img"
              src={ledgerConnectSuccessful ? LedgerSigning : Ledger}
              alt="ledger"
            />
            <span>
              {ledgerConnectSuccessful
                ? t("Review transaction on device")
                : t("Connect device to computer")}
            </span>
          </div>
        </div>
        <div className="LedgerSign__bottom">
          <LedgerErrorBlock error={connectError} />
          {!ledgerConnectSuccessful && (
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              onClick={handleSign}
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
