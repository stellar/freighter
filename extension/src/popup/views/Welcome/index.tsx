import React from "react";
import { Button } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";

import { Card } from "popup/basics/Card";

import "./styles.scss";

export const Welcome = () => (
  <>
    <FullscreenStyle />
    <Header />
    <div className="Welcome__column">
      <div className="Welcome__centered-screen">
        <div className="Welcome__heading--large">
          Welcome! Is this your first time using Freighter?
        </div>
      </div>
      <div className="Welcome__row-screen">
        <div className="Welcome__half-screen">
          <Card variant={Card.variant.highlight}>
            <div className="Welcome__heading--small">I’m new!</div>
            <div className="Welcome__text">I’m going to need a seed phrase</div>
            <div className="Welcome__button-container">
              <Button
                fullWidth
                onClick={() => navigateTo(ROUTES.accountCreator)}
              >
                CREATE WALLET
              </Button>
            </div>
          </Card>
        </div>
        <div className="Welcome__half-screen">
          <Card>
            <div className="Welcome__heading--small">I’ve done this before</div>
            <div className="Welcome__text">I have my 12 word seed phrase</div>
            <div className="Welcome__button-container">
              <Button
                fullWidth
                variant={Button.variant.tertiary}
                onClick={() => navigateTo(ROUTES.recoverAccount)}
              >
                IMPORT WALLET
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </>
);
