import React, { useEffect } from "react";
import TransportWebUSB from "@ledgerhq/hw-transport-webusb";
import LedgerApi from "@ledgerhq/hw-app-str";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BottomNav } from "popup/components/BottomNav";
import { WalletType } from "popup/views/AddAccount/connect/ConnectWallet";

import "./styles.scss";

export const PluginWallet = () => {
  // ALEC TODO - dont assume ledger
  useEffect(() => {
    (async () => {
      // ALEC TODO - put in a constant
      const defaultStellarBipPath = "44'/148'/0'";
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
    })();
  }, []);

  return (
    <>
      <div className="PluginWallet">
        <SubviewHeader
          title={`Plug in ${WalletType.LEDGER} wallet`}
          hasBackButton={true}
          customBackAction={() => navigateTo(ROUTES.connectWallet)}
        />
        {/* ALEC TODO - add click here link */}
        <p>
          Connect your wallet directly to your computer. Unlock your Ledger and
          open the Stellar app. For more info on using your hardware wallet
          device, click here.
        </p>
        <div className="PluginWallet__btn-continue">
          <Button fullWidth variant={Button.variant.tertiary}>
            Detect
          </Button>
        </div>
      </div>
      <BottomNav />
    </>
  );
};
