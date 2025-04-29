import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import browser from "webextension-polyfill";

import * as ApiInternal from "@shared/api/internal";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { AddFunds } from "../AddFunds";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

const token = "foo";

jest.mock("webextension-polyfill", () => ({
  tabs: {
    create: jest.fn(),
  },
}));

jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    hasPrivateKey: true,
    publicKey: "G1",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "bip-path",
    tokenIdList: [],
  }),
);

jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
  Promise.resolve({
    networkDetails: TESTNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    hiddenAssets: {},
    allowList: ApiInternal.DEFAULT_ALLOW_LIST,
    error: "",
    isDataSharingAllowed: false,
    isMemoValidationEnabled: false,
    isHideDustEnabled: true,
    settingsState: SettingsState.SUCCESS,
    isSorobanPublicEnabled: false,
    isRpcHealthy: true,
    userNotification: {
      enabled: false,
      message: "",
    },
    isExperimentalModeEnabled: false,
    isHashSigningEnabled: false,
    isNonSSLEnabled: false,
    experimentalFeaturesState: SettingsState.SUCCESS,
    assetsLists: DEFAULT_ASSETS_LISTS,
  }),
);

const newTabSpy = jest
  .spyOn(browser.tabs, "create")
  // @ts-ignore
  .mockImplementation(() => Promise.resolve());

// @ts-ignore
const mockFetch = jest.spyOn(global, "fetch").mockResolvedValue({
  json: () => Promise.resolve({ data: { token } }),
  ok: true,
});

describe("AddFunds view", () => {
  it("displays Coinbase onramp button and opens Coinbase's default flow", async () => {
    render(
      <Wrapper
        routes={[ROUTES.addFunds]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <AddFunds />
      </Wrapper>,
    );

    await waitFor(async () => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Add funds",
      );
      const coinbaseButton = screen.getByTestId("add-coinbase-button");
      await fireEvent.click(coinbaseButton);
      expect(newTabSpy).toHaveBeenCalledWith({
        url: `https://pay.coinbase.com/buy/select-asset?sessionToken=${token}&defaultExperience=buy`,
      });
    });
  });
  it("displays Coinbase onramp button and opens Coinbase's XLM flow", async () => {
    render(
      <Wrapper
        routes={[`${ROUTES.addFunds}?isAddXlm=true`]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <AddFunds />
      </Wrapper>,
    );

    await waitFor(async () => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Add XLM",
      );
      const coinbaseButton = screen.getByTestId("add-coinbase-button");
      await fireEvent.click(coinbaseButton);
      expect(newTabSpy).toHaveBeenCalledWith({
        url: `https://pay.coinbase.com/buy/select-asset?sessionToken=${token}&defaultExperience=buy&defaultAsset=XLM`,
      });
    });
  });
});
