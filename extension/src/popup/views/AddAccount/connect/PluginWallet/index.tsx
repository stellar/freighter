import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Checkbox, Input, TextLink } from "@stellar/design-system";
import { WalletType } from "@shared/constants/hardwareWallet";

import { AppDispatch } from "popup/App";
import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";
import {
  LedgerConnect,
  defaultStellarBipPath,
} from "popup/components/hardwareConnect/LedgerConnect";
import {
  transactionSubmissionSelector,
  HwSigningStatus,
  openHwOverlay,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";

export const PluginWallet = () => {
  const dispatch: AppDispatch = useDispatch();
  const {
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);

  // TODO - move to redux
  const [bipPath, setBipPath] = useState(defaultStellarBipPath);
  const [useDefault, setUseDefault] = useState(true);

  return (
    <>
      {hwStatus === HwSigningStatus.IN_PROGRESS && <LedgerConnect />}
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
          <Button fullWidth onClick={() => dispatch(openHwOverlay({}))}>
            Connect
          </Button>
        </div>
      </div>
      <BottomNav />
    </>
  );
};
