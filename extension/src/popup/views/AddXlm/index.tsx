import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";

import CoinbaseLogo from "popup/assets/coinbase-logo.svg";

import "./styles.scss";

export const AddXlm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const publicKey = useSelector(publicKeySelector);
  const {
    isLoading: isTokenRequestLoading,
    fetchData,
    tokenError,
  } = useGetOnrampToken({ publicKey, asset: "XLM" });

  const handleOnrampClick = async () => {
    await fetchData();
  };

  const handleTransferClick = () => {
    navigateTo(ROUTES.viewPublicKey, navigate);
  };

  if (isTokenRequestLoading) {
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
