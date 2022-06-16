import React, { useState } from "react";
import { Checkbox, Input, TextLink } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";
import { WalletType } from "constants/hardwareWallet";
import {
  LedgerConnect,
  defaultStellarBipPath,
} from "popup/components/hardwareConnect/LedgerConnect";

import "./styles.scss";

export const PluginWallet = () => {
  // TODO - move to redux
  const [bipPath, setBipPath] = useState(defaultStellarBipPath);
  const [useDefault, setUseDefault] = useState(true);
  const [showLedgerOverlay, setShowLedgerOverlay] = useState(false);

  return (
    <>
      {showLedgerOverlay && (
        <LedgerConnect goBack={() => setShowLedgerOverlay(false)} />
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
            defaultChecked
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
