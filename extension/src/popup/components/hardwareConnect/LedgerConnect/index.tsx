import React, { useState } from "react";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";
import { Icon, InfoBlock } from "@stellar/design-system";

import { importHardwareWallet } from "@shared/api/internal";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import Ledger from "popup/assets/ledger.png";
import LedgerConnected from "popup/assets/ledger-connected.png";

import "./styles.scss";

export const defaultStellarBipPath = "44'/148'/0'";

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

export const LedgerConnect = ({ goBack }: { goBack?: () => void }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  // TODO - move to redux with bipPath
  const [publicKey, setPublicKey] = useState("");
  const isConnected = !!publicKey;
  const [connectError, setConnectError] = useState("");

  const handleConnect = async () => {
    setIsConnecting(true);

    // ALEC TODO - remove hardcode
    console.log("attempting import");
    const pubKey = "GAARKRDCQQJOQYKBUY4ZI5NJQGEU3QRTCOXENJBMTUY5O7KXKULSWDEH";
    const walletType = "LEDGER";
    try {
      await importHardwareWallet(pubKey, walletType);
    } catch (e) {
      console.log({ e });
    }

    try {
      const transport = await TransportWebUSB.request();
      const ledgerApi = new LedgerApi(transport);
      const response = await ledgerApi.getPublicKey(defaultStellarBipPath);

      setPublicKey(response.publicKey);
      setConnectError("");
    } catch (e) {
      setConnectError(parseLedgerError(e));
    }
    setIsConnecting(false);
  };

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

  return (
    <div className="LedgerConnect">
      <div className="LedgerConnect__wrapper">
        <SubviewHeader
          customBackAction={goBack || undefined}
          customBackIcon={<Icon.X />}
          title="Connect Ledger"
        />
        <div className="LedgerConnect__content">
          <div className="LedgerConnect__success">
            {isConnected ? "Connected" : ""}
          </div>
          <div className="LedgerConnect__content__center">
            <img
              className="LedgerConnect__img"
              src={isConnected ? LedgerConnected : Ledger}
              alt="ledger"
            />
            <span>
              {isConnected
                ? "You’re good to go!"
                : "Connect device to computer"}
            </span>
          </div>
        </div>
        <div className="LedgerConnect__bottom">
          <ConnectError />
          {isConnected ? (
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              onClick={() => navigateTo(ROUTES.account)}
            >
              Done
            </Button>
          ) : (
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              onClick={handleConnect}
              isLoading={isConnecting}
            >
              {isConnecting ? "Detecting" : "Detect device"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
