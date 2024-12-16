import React from "react";
import { Button, Heading } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";

import LogoWelcome from "popup/assets/logo-freighter-welcome.svg";

import "./styles.scss";

export const Welcome = () => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <View.Content>
        <div className="Welcome__column">
          <div className="Welcome__centered-screen">
            <img src={LogoWelcome} alt="Freighter logo" />
            <div>
              <Heading
                addlClassName="Welcome__heading"
                as="h1"
                size="xl"
                weight="semi-bold"
              >
                {t("Welcome to Freighter")}
              </Heading>
              <Heading
                addlClassName="Welcome__heading Welcome__heading--subheading"
                as="h1"
                size="xl"
                weight="semi-bold"
              >
                {t("Your favorite Stellar wallet")}
              </Heading>
            </div>
            <div className="Welcome__cta">
              {t("How do you want to get started?")}
            </div>
          </div>
          <div className="Welcome__row-screen">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigateTo(ROUTES.accountCreator)}
            >
              {t("Create new wallet")}
            </Button>
            <Button
              size="lg"
              variant="tertiary"
              onClick={() => navigateTo(ROUTES.recoverAccount)}
            >
              {t("Import wallet")}
            </Button>
          </div>
        </div>
      </View.Content>
    </React.Fragment>
  );
};
