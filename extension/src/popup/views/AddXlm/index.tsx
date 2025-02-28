import React, { useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@stellar/design-system";
import { captureException } from "@sentry/browser";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";
import { INDEXER_URL } from "@shared/constants/mercury";
import { ROUTES } from "popup/constants/routes";
import { openTab, navigateTo } from "popup/helpers/navigate";

import CoinbaseLogo from "popup/assets/coinbase-logo.svg";

import "./styles.scss";

export const AddXlm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const publicKey = useSelector(publicKeySelector);
  const [tokenError, setTokenError] = useState("");

  const handleOnrampClick = async () => {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: publicKey }),
    };
    const url = `${INDEXER_URL}/onramp/token`;
    const response = await fetch(url, options);
    const resJson = await response.json();

    const token = resJson?.data?.token;

    if (!token) {
      setTokenError("Unable to communicate with Coinbase");
      captureException(
        `Unable to fetch Coinbase session token: ${resJson?.data?.error}`
      );
      return;
    }

    setTokenError("");
    const coinbaseUrl = `https://pay.coinbase.com/buy/select-asset?sessionToken=${token}&defaultExperience=buy&assets=["XLM"]`;

    openTab(coinbaseUrl);
  };

  const handleTransferClick = () => {
    navigateTo(ROUTES.viewPublicKey, navigate);
  };

  return (
    <>
      <SubviewHeader
        title={t("Add XLM")}
        subtitle={<div>{t("Choose your method")}</div>}
      />
      <View.Content>
        <div className="AddXlm__content">
          <Button
            data-testid="add-xlm-coinbase-button"
            iconPosition="left"
            isFullWidth
            icon={
              <img
                className="AddXlm__onrampLogo"
                src={CoinbaseLogo}
                alt="Coinbase Logo"
              />
            }
            size="lg"
            variant="secondary"
            onClick={handleOnrampClick}
          >
            {t("Buy XLM with Coinbase")}
          </Button>
          <Button
            iconPosition="left"
            isFullWidth
            icon={<Icon.QrCode01 />}
            size="lg"
            variant="tertiary"
            onClick={handleTransferClick}
          >
            {t("Transfer from another account")}
          </Button>
          {tokenError && <div className="AddXlm__error">{tokenError}</div>}
        </div>
      </View.Content>
    </>
  );
};
