import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { Icon } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import IconMoneyGram from "popup/assets/icon-moneygram.svg";
import IconMoonpay from "popup/assets/icon-moonpay.svg";
import { getAssetFromCanonical } from "helpers/stellar";

import "./styles.scss";

export const BuyAsset = () => {
  const { t } = useTranslation();
  const { buyAsset } = useSelector(transactionSubmissionSelector);
  const assetCode = getAssetFromCanonical(buyAsset).code;
  return (
    <PopupWrapper>
      <div className="BuyAsset">
        <SubviewHeader title={`Add ${assetCode}`} />
        <div className="BuyAsset__prompt">
          {t("How would you like to add")} {assetCode}?
        </div>
        <div className="BuyAsset__card">
          <div className="BuyAsset__card__row">
            <div className="BuyAsset__card__icon">
              <div className="BuyAsset__qr-icon">
                <Icon.QrCode />
              </div>
            </div>
            <div className="BuyAsset__title">
              {t("Transfer from another account")}
            </div>
          </div>
        </div>
        <div
          className="BuyAsset__card"
          onClick={() => navigateTo(ROUTES.buyMoneyGram)}
        >
          <div className="BuyAsset__card__row">
            <div className="BuyAsset__card__icon">
              <img src={IconMoneyGram} alt="moneygram icon" />
            </div>
            <div className="BuyAsset__title">
              {t("Buy with cash using MoneyGram")}
            </div>
          </div>

          <div className="BuyAsset__card__row">
            <div className="BuyAsset__card__icon"></div>
            <div className="BuyAsset__caption">
              {t(
                "Accepts credit/debit cards, Apple Pay, Google Pay and bank transfers",
              )}
            </div>
          </div>
        </div>
        <div className="BuyAsset__card">
          <div className="BuyAsset__card__row">
            <div className="BuyAsset__card__icon">
              <img src={IconMoonpay} alt="moonpay icon" />
            </div>
            <div className="BuyAsset__title">{t("Buy with Moonpay")}</div>
          </div>
          <div className="BuyAsset__card__row">
            <div className="BuyAsset__card__icon"> </div>
            <div className="BuyAsset__caption">
              {t(
                "Accepts credit/debit cards, Apple Pay, Google Pay and bank transfers",
              )}
            </div>
          </div>
        </div>
      </div>
    </PopupWrapper>
  );
};
