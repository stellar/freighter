import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";
import { Icon, InfoBlock } from "@stellar/design-system";
import { WalletType } from "@shared/constants/hardwareWallet";

import { POPUP_HEIGHT } from "constants/dimensions";

import { AppDispatch } from "popup/App";
import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import Ledger from "popup/assets/ledger.png";
import LedgerConnected from "popup/assets/ledger-connected.png";
import LedgerSigning from "popup/assets/ledger-signing.png";
import {
  importHardwareWallet,
  bipPathSelector,
} from "popup/ducks/accountServices";
import {
  signWithLedger,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  closeHwOverlay,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

enum LEDGER_ERROR {
  NO_DEVICE = "NO_DEVICE",
  NOT_OPEN = "NOT_OPEN",
  OTHER = "OTHER",
}

const parseLedgerError = (err: any): string => {
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

export const LedgerConnect = ({ newBipPath }: { newBipPath?: string }) => {
  const dispatch: AppDispatch = useDispatch();
  const [isDetecting, setIsDetecting] = useState(false);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    hardwareWalletData: { transactionXDR },
  } = useSelector(transactionSubmissionSelector);
  // if importing, get bipPath from user input,
  // else get saved bipPath from redux
  const signingBipPath = useSelector(bipPathSelector);
  const bipPath = newBipPath || signingBipPath;
  const isSigningTransaction = !!transactionXDR;

  const [ledgerConnectSuccessful, setLedgerConnectSuccessful] = useState(false);
  const [connectError, setConnectError] = useState("");

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

  const handleConnect = async () => {
    setIsDetecting(true);
    setConnectError("");
    try {
      const transport = await TransportWebUSB.request();
      const ledgerApi = new LedgerApi(transport);
      const response = await ledgerApi.getPublicKey(bipPath);
      setLedgerConnectSuccessful(true);

      // if not signing a tx then assume initial account import
      if (!isSigningTransaction) {
        dispatch(
          importHardwareWallet({
            publicKey: response.publicKey,
            hardwareWalletType: WalletType.LEDGER,
            bipPath,
          }),
        );
      } else {
        const res = await dispatch(
          signWithLedger({
            transactionXDR: transactionXDR as string,
            networkPassphrase: networkDetails.networkPassphrase,
            publicKey: response.publicKey,
            bipPath,
          }),
        );
        if (signWithLedger.fulfilled.match(res)) {
          dispatch(
            submitFreighterTransaction({
              signedXDR: res.payload,
              networkDetails,
            }),
          );
          closeOverlay();
        } else {
          setLedgerConnectSuccessful(false);
          setConnectError(parseLedgerError(res.payload?.errorMessage || ""));
        }
      }
    } catch (e) {
      setConnectError(parseLedgerError(e));
    }
    setIsDetecting(false);
  };

  // let's check connection on initial load
  useEffect(() => {
    handleConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ConnectError = () => {
    let errorMessage = "";
    switch (connectError) {
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

  const getLedgerImage = () => {
    if (ledgerConnectSuccessful) {
      return isSigningTransaction ? LedgerSigning : LedgerConnected;
    }
    return Ledger;
  };

  const getLedgerCaption = () => {
    if (ledgerConnectSuccessful) {
      return isSigningTransaction
        ? "Review transaction on device"
        : "You’re good to go!";
    }
    return "Connect device to computer";
  };

  const getLedgerButton = () => {
    if (ledgerConnectSuccessful) {
      return isSigningTransaction ? null : (
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => navigateTo(ROUTES.account)}
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
        {isDetecting ? "Detecting" : "Detect device"}
      </Button>
    );
  };

  return (
    <div className="LedgerConnect">
      <div className="LedgerConnect__wrapper" ref={ledgerConnectRef}>
        <SubviewHeader
          customBackAction={closeOverlay}
          customBackIcon={<Icon.X />}
          title="Connect Ledger"
        />
        <div className="LedgerConnect__content">
          <div className="LedgerConnect__success">
            {ledgerConnectSuccessful ? "Connected" : ""}
          </div>
          <div className="LedgerConnect__content__center">
            <img
              className="LedgerConnect__img"
              src={getLedgerImage()}
              alt="ledger"
            />
            <span>{getLedgerCaption()}</span>
          </div>
        </div>
        <div className="LedgerConnect__bottom">
          <ConnectError />
          {getLedgerButton()}
        </div>
      </div>
      <LoadingBackground onClick={undefined} isActive={true} />
    </div>
  );
};
