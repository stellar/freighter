import React from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { SubviewHeader } from "popup/components/SubviewHeader";
import IconGreenCheck from "popup/assets/icon-green-check.svg";
import MoneyGramLogo from "popup/assets/moneygram-logo.svg";

import "./styles.scss";

export const MoneyGram = () => {
  const { t } = useTranslation();
  return (
    <div className="MoneyGram">
      <SubviewHeader title="" />
      <div className="MoneyGram__logo__caption">{t("Powered by")}</div>
      <div className="MoneyGram__logo">
        <img src={MoneyGramLogo} alt="moneygram logo" />
      </div>
      <div className="MoneyGram__title">
        {t("Buy with cash using MoneyGram")}
      </div>
      <div className="MoneyGram__bullet">
        <div className="MoneyGram__bullet__item">
          <img src={IconGreenCheck} alt="check" />
        </div>
        <div className="MoneyGram__bullet__item">
          {t("Create an order in Freighter")}
        </div>
      </div>
      <div className="MoneyGram__bullet">
        <div className="MoneyGram__bullet__item">
          <img src={IconGreenCheck} alt="check" />
        </div>
        <div className="MoneyGram__bullet__item">
          {t("Drop-off your cash at any participating Money Gram location")}
        </div>
      </div>
      <div className="MoneyGram__bullet">
        <div className="MoneyGram__bullet__item">
          <img src={IconGreenCheck} alt="check" />
        </div>
        <div className="MoneyGram__bullet__item">
          {t("USDC arrives instantly once drop-off is complete")}
        </div>
      </div>
      <div className="MoneyGram__bottom">
        <div className="MoneyGram__bottom__terms">
          {t("By continuing, you agree to MoneyGram’s")}
          <TextLink
            underline
            variant={TextLink.variant.secondary}
            // TODO - moneygram url
            href=""
            rel="noreferrer"
            target="_blank"
          >
            {t("Terms and Conditions.")}
          </TextLink>
        </div>
        <div className="MoneyGram__bottom__btn">
          <Button fullWidth variant={Button.variant.tertiary}>
            Continue to MoneyGram
          </Button>
        </div>
      </div>
    </div>
  );
};
