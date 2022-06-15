import React, { useState } from "react";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";
import { Checkbox, Icon, Input, TextLink } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";
import { WalletType } from "popup/views/AddAccount/connect/ConnectWallet";
import Ledger from "popup/assets/ledger.png";

import "./styles.scss";

// ALEC TODO - put in a constant
const defaultStellarBipPath = "44'/148'/0'";

// ALEC TODO - probably move this somewhere
const LedgerOverlay = ({ goBack }: { goBack?: () => void }) => {
  const handleConnect = async () => {
    try {
      const transport = await TransportWebUSB.request();

      // ALEC TODO - probably move some (all?) to a duck
      const ledgerApi = new LedgerApi(transport);

      const response = await ledgerApi.getPublicKey(defaultStellarBipPath);

      const publicKey = response.publicKey;

      // ALEC TODO - remove
      console.log({ publicKey });
    } catch (e) {
      // ALEC TODO - store somewhere
      console.log({ e });
    }
  };

  // ALEC TODO - remove
  console.log({ handleConnect });
  return (
    <div className="LedgerOverlay">
      <div className="LedgerOverlay__wrapper">
        <SubviewHeader
          customBackAction={goBack || undefined}
          customBackIcon={<Icon.X />}
          title="Connect Ledger"
        />
        <div className="LedgerOverlay__center">
          <img className="LedgerOverlay__img" src={Ledger} alt="ledger" />
          <span>Connect device to computer</span>
        </div>
        <Button fullWidth variant={Button.variant.tertiary}>
          Detect device
        </Button>
      </div>
    </div>
  );
};

export const PluginWallet = () => {
  const [bipPath, setBipPath] = useState(defaultStellarBipPath);
  const [useDefault, setUseDefault] = useState(true);
  const [showLedgerOverlay, setShowLedgerOverlay] = useState(false);

  return (
    <>
      {showLedgerOverlay && (
        <LedgerOverlay goBack={() => setShowLedgerOverlay(false)} />
      )}
      <div className="PluginWallet">
        <SubviewHeader
          title={`Connect with ${WalletType.LEDGER}`}
          hasBackButton={true}
          customBackAction={() => navigateTo(ROUTES.connectWallet)}
        />
        <p>
          Make sure your Ledger wallet is connected to your computer and the
          Stellar app is open on the Ledger wallet.{" "}
          <TextLink
            variant={TextLink.variant.secondary}
            href="https://www.ledger.com/stellar-wallet"
            rel="noreferrer"
            target="_blank"
          >
            Learn more about using Ledger
          </TextLink>
        </p>
        <div className="PluginWallet__bottom">
          {!useDefault && (
            <div>
              <div className="PluginWallet__caption">ENTER BIP PATH</div>
              <Input
                autoComplete="off"
                id="bipPath"
                value={bipPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setBipPath(e.target.value);
                }}
              />
            </div>
          )}
          <Checkbox
            checked={useDefault}
            autoComplete="off"
            id="useDefault-input"
            label={
              <span className="PluginWallet__checkbox-label">
                Use default account
              </span>
            }
            onClick={() => setUseDefault(!useDefault)}
          />
          <Button fullWidth onClick={() => setShowLedgerOverlay(true)}>
            Connect
          </Button>
        </div>
      </div>
      <BottomNav />
    </>
  );
};
