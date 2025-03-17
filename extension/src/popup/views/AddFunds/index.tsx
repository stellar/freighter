import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon, Text } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { publicKeySelector } from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";

import CoinbaseLogo from "popup/assets/coinbase-logo.svg";

import "./styles.scss";

export const AddFunds = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { search } = useLocation();
  const publicKey = useSelector(publicKeySelector);

  const params = new URLSearchParams(search);
  const isAddXlm = params.get("isAddXlm") === "true";

  const {
    isLoading: isTokenRequestLoading,
    fetchData,
    tokenError,
  } = useGetOnrampToken({ publicKey, ...(isAddXlm ? { asset: "XLM" } : {}) });

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
        title={isAddXlm ? t("Add XLM") : t("Add funds")}
        subtitle={<div>{t("Choose your method")}</div>}
      />
      <View.Content>
        <div className="AddFunds">
          <div className="AddFunds__content">
            <div className="AddFunds__button" onClick={handleOnrampClick}>
              <img
                className="AddFunds__onrampLogo"
                src={CoinbaseLogo}
                alt="Coinbase Logo"
              />
              <div>
                <Text
                  as="div"
                  size="sm"
                  weight="semi-bold"
                  addlClassName="AddFunds__button__title"
                >
                  {isAddXlm
                    ? t("Buy XLM with Coinbase")
                    : t("Buy with Coinbase")}
                </Text>
                <Text
                  as="div"
                  size="sm"
                  weight="medium"
                  addlClassName="AddFunds__button__description"
                >
                  {t(
                    "Transfer from Coinbase, buy with debit and credit cards or bank transfer *",
                  )}
                </Text>
              </div>
            </div>
            <div className="AddFunds__button" onClick={handleTransferClick}>
              <div className="AddFunds__button__qr">
                <Icon.QrCode01 />
              </div>
              <div>
                <Text
                  as="div"
                  size="sm"
                  weight="semi-bold"
                  addlClassName="AddFunds__button__title"
                >
                  {t("Transfer from another account")}
                </Text>
                <Text
                  as="div"
                  size="sm"
                  weight="medium"
                  addlClassName="AddFunds__button__description"
                >
                  {isAddXlm
                    ? t("Send XLM to this account address")
                    : t("Send funds to this account address")}
                </Text>
              </div>
            </div>
            {tokenError && <div className="AddFunds__error">{tokenError}</div>}
          </div>
          <div className="AddFunds__footer">
            <Text as="div" size="xs" weight="medium">
              {t("* payment methods may vary based on your location")}
            </Text>
          </div>
        </div>
      </View.Content>
    </>
  );
};
