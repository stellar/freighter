import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Heading } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";

import LogoWelcome from "popup/assets/logo-freighter-welcome-2.svg";

import "./styles.scss";

export const Welcome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <React.Fragment>
      <View.Content>
        <div className="Welcome__column">
          <div className="Welcome__centered-screen">
            <img src={LogoWelcome} alt="Freighter logo" />
            <div>
              <Heading addlClassName="Welcome__heading" as="h1" size="lg">
                {t("Freighter Wallet")}
              </Heading>
            </div>
          </div>
          <div className="Welcome__row-screen">
            <Button
              size="lg"
              isRounded
              variant="secondary"
              onClick={() => navigateTo(ROUTES.accountCreator, navigate)}
            >
              {t("Create new wallet")}
            </Button>
            <Button
              size="lg"
              isRounded
              variant="tertiary"
              onClick={() => navigateTo(ROUTES.recoverAccount, navigate)}
            >
              {t("I already have a wallet")}
            </Button>
          </div>
        </div>
      </View.Content>
    </React.Fragment>
  );
};
