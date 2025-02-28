import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Checkbox, Input, Link } from "@stellar/design-system";
import { ConfigurableWalletType } from "@shared/constants/hardwareWallet";

import { newTabHref } from "helpers/urls";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { pluginWalletInfo } from "popup/helpers/hardwareConnect";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const defaultStellarBipPath = "44'/148'/0'";

export const PluginWallet = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const walletType = new URLSearchParams(location.search).get(
    "walletType",
  ) as ConfigurableWalletType;
  const [bipPath, setBipPath] = useState(defaultStellarBipPath);
  const [useDefault, setUseDefault] = useState(true);

  const pluginWalletInfoSection = pluginWalletInfo[walletType];

  return (
    <>
      <SubviewHeader
        title={`Connect with ${walletType}`}
        hasBackButton={true}
        customBackAction={() => navigateTo(ROUTES.connectWallet, navigate)}
      />
      <View.Content>
        <p>{pluginWalletInfoSection.instruction}</p>
        <p>
          <Link
            variant="secondary"
            href={pluginWalletInfoSection.link.href}
            rel="noreferrer"
            target="_blank"
          >
            {pluginWalletInfoSection.link.text}
          </Link>
        </p>
        <div className="PluginWallet__bottom">
          {!useDefault && (
            <div>
              <div className="PluginWallet__caption">ENTER BIP PATH</div>
              <Input
                fieldSize="md"
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
            fieldSize="md"
            defaultChecked
            autoComplete="off"
            id="useDefault-input"
            label="Use default account"
            onClick={() => setUseDefault(!useDefault)}
          />
          <Button
            size="md"
            isFullWidth
            variant="primary"
            onClick={() => {
              openTab(
                newTabHref(
                  ROUTES.connectDevice,
                  `bipPath=${bipPath}&walletType=${walletType}`,
                ),
              );
            }}
          >
            Connect
          </Button>
        </div>
      </View.Content>
    </>
  );
};
