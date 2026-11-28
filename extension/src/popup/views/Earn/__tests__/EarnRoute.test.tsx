import React from "react";
import { render, screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";

import { SettingsState } from "@shared/api/types";
import {
  FUTURENET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";
import { EarnRoute } from "popup/views/Earn/EarnRoute";
import { Wrapper } from "popup/__testHelpers__";

const renderAtEarn = ({
  isInitialized = true,
  earnDeposit = true,
  settingsState = SettingsState.SUCCESS,
  networkDetails = TESTNET_NETWORK_DETAILS,
}: {
  isInitialized?: boolean;
  earnDeposit?: boolean;
  settingsState?: SettingsState;
  networkDetails?: NetworkDetails;
}) =>
  render(
    <Wrapper
      routes={[ROUTES.earn]}
      state={{
        settings: { settingsState, networkDetails },
        remoteConfig: {
          isInitialized,
          use_balances_v2: false,
          use_token_price_history: false,
          earn_deposit: earnDeposit,
          maintenance_banner: { enabled: false, payload: undefined },
          maintenance_screen: { enabled: false, payload: undefined },
        },
      }}
    >
      <Routes>
        <Route path={ROUTES.account} element={<div data-testid="home" />} />
        <Route
          path={ROUTES.earn}
          element={
            <EarnRoute>
              <div data-testid="earn" />
            </EarnRoute>
          }
        />
      </Routes>
    </Wrapper>,
  );

describe("EarnRoute", () => {
  it("opens Earn when the flag is on and the network has a pool", () => {
    renderAtEarn({});

    expect(screen.getByTestId("earn")).toBeInTheDocument();
  });

  it("waits for the flags rather than turning a fresh load away", () => {
    // Until the flags load, earn_deposit reads as off whatever it really is.
    renderAtEarn({ isInitialized: false });

    expect(screen.getByTestId("Loading")).toBeInTheDocument();
    expect(screen.queryByTestId("earn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });

  it("sends the user Home when earn_deposit is off", () => {
    renderAtEarn({ earnDeposit: false });

    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(screen.queryByTestId("earn")).not.toBeInTheDocument();
  });

  it("sends the user Home on a network with no pool", () => {
    renderAtEarn({ networkDetails: FUTURENET_NETWORK_DETAILS });

    expect(screen.getByTestId("home")).toBeInTheDocument();
    expect(screen.queryByTestId("earn")).not.toBeInTheDocument();
  });

  it("lets Earn load the settings before checking the network", () => {
    // A fresh load starts on the default settings; Earn loads the real ones.
    renderAtEarn({
      settingsState: SettingsState.IDLE,
      networkDetails: FUTURENET_NETWORK_DETAILS,
    });

    expect(screen.getByTestId("earn")).toBeInTheDocument();
  });
});
