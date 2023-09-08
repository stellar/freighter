import React from "react";
import { Button, Card } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";

import "./styles.scss";

export const Welcome = () => {
  const { t } = useTranslation();

  return (
    <>
      <FullscreenStyle />
      <Header />
      <div className="Welcome__column">
        <div className="Welcome__centered-screen">
          <div className="Welcome__heading--large">
            {t("Welcome! Is this your first time using Freighter?")}
          </div>
        </div>
        <div className="Welcome__row-screen">
          <div className="Welcome__half-screen">
            <Card variant="secondary">
              <div className="Welcome__heading--small">{t("I’m new!")}</div>
              <div className="Welcome__text">
                {t("I’m going to need a seed phrase")}
              </div>
              <div className="Welcome__button-container">
                <Button
                  size="md"
                  isFullWidth
                  variant="primary"
                  onClick={() => navigateTo(ROUTES.accountCreator)}
                >
                  {t("CREATE WALLET")}
                </Button>
              </div>
            </Card>
          </div>
          <div className="Welcome__half-screen Welcome__import">
            <Card>
              <div className="Welcome__heading--small">
                {t("I’ve done this before")}
              </div>
              <div className="Welcome__text">
                {t("I have my 12 word seed phrase")}
              </div>
              <div className="Welcome__button-container">
                <Button
                  size="md"
                  isFullWidth
                  variant="secondary"
                  onClick={() => navigateTo(ROUTES.recoverAccount)}
                >
                  {t("IMPORT WALLET")}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};
