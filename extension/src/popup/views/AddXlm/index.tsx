import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@stellar/design-system";
import { captureException } from "@sentry/browser";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";
import {
  useGetOnrampToken,
  RequestState,
} from "helpers/hooks/useGetOnrampToken";

import CoinbaseLogo from "popup/assets/coinbase-logo.svg";

import "./styles.scss";

export const AddXlm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const publicKey = useSelector(publicKeySelector);
  const [tokenError, setTokenError] = useState("");
  const { state: onrampTokenState, fetchData } = useGetOnrampToken(publicKey);

  useEffect(() => {
    if (onrampTokenState.state === RequestState.ERROR) {
      setTokenError("Unable to communicate with Coinbase");
      captureException("Unable to fetch Coinbase session token");
    }

    if (onrampTokenState.state === RequestState.SUCCESS) {
      const token = onrampTokenState.data.token;

      setTokenError("");
      captureException("Unable to fetch Coinbase session token");
      const coinbaseUrl = `https://pay.coinbase.com/buy/select-asset?sessionToken=${token}&defaultExperience=buy&assets=["XLM"]`;

      openTab(coinbaseUrl);
    }
  }, [onrampTokenState]);

  const handleOnrampClick = async () => {
    await fetchData();
  };

  const handleTransferClick = () => {
    navigateTo(ROUTES.viewPublicKey, navigate);
  };

  const isLoaderShowing = onrampTokenState.state === RequestState.LOADING;

  if (isLoaderShowing) {
    return <Loading />;
  }

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
            {t("Buy with Coinbase")}
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
