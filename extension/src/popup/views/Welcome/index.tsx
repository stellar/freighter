import React from "react";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import { Header } from "popup/components/Header";

import { Card } from "popup/basics/Card";
import { Button } from "@stellar/design-system";

import "./styles.scss";
import "popup/styles/fullScreen.scss";

export const Welcome = () => (
  <>
    <Header />
    <div className="Welcome--column">
      <div className="Welcome--centered-screen">
        <div className="Welcome--heading--large">
          Welcome! Is this your first time using Freighter?
        </div>
      </div>
      <div className="Welcome--row-screen">
        <div className="Welcome--half-screen">
          <Card variant={Card.variant.highlight}>
            <div className="Welcome--heading--small">I’m new!</div>
            <div className="Welcome--text">I’m going to need a seed phrase</div>
            <div className="Welcome--button-container">
              <Button
                fullWidth
                onClick={() => navigateTo(ROUTES.accountCreator)}
              >
                CREATE WALLET
              </Button>
            </div>
          </Card>
        </div>
        <div className="Welcome--half-screen">
          <Card>
            <div className="Welcome--heading--small">I’ve done this before</div>
            <div className="Welcome--text">I have my 12 word seed phrase</div>
            <div className="Welcome--button-container">
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
