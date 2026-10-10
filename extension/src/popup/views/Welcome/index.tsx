import React from "react";
import { useNavigate } from "react-router-dom";
import { Button, Display, Heading } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import { RebrandNotice } from "popup/components/RebrandNotice";

import LogoWelcome from "popup/assets/logo-varial.svg?react";

import "./styles.scss";

export const Welcome = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <React.Fragment>
      <View.Content>
        <div className="Welcome">
          <div className="Welcome__intro">
            <LogoWelcome role="img" aria-label={t("Varial logo")} />
            <div className="Welcome__titles">
              <div>
                <Heading as="h1" size="md" weight="semi-bold">
                  {t("Welcome to Varial")}
                </Heading>
                <Display
                  size="md"
                  weight="semi-bold"
                  addlClassName="Welcome__subtitle"
                >
                  {t("Your favorite Stellar wallet")}
                </Display>
              </div>
              <RebrandNotice size="md" />
            </div>
          </div>
          <div className="Welcome__buttons">
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigateTo(ROUTES.accountCreator, navigate)}
            >
              {t("Create new wallet")}
            </Button>
            <Button
              size="lg"
              variant="tertiary"
              onClick={() => navigateTo(ROUTES.recoverAccount, navigate)}
            >
              {t("Import wallet")}
            </Button>
          </div>
        </div>
      </View.Content>
    </React.Fragment>
  );
};
