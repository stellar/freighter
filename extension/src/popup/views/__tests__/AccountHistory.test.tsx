import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";
import * as TokenListHelpers from "@shared/api/helpers/token-list";

import {
  Wrapper,
  mockAccounts,
  mockAccountHistory,
  mockBalances,
} from "../../__testHelpers__";
import { AccountHistory } from "../AccountHistory";
import { ROUTES } from "popup/constants/routes";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

jest.spyOn(ApiInternal, "getAssetIconCache").mockImplementation(() =>
  Promise.resolve({
    icons: {},
  }),
);

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

jest
  .spyOn(ApiInternal, "getAccountHistory")
  .mockImplementation(() => Promise.resolve(mockAccountHistory as any));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() =>
  Promise.resolve({
    hiddenAssets: {},
    error: "",
  }),
);

jest
  .spyOn(ApiInternal, "getAssetIcons")
  .mockImplementation(() => Promise.resolve({}));

jest
  .spyOn(TokenListHelpers, "getCombinedAssetListData")
  .mockImplementation(() => Promise.resolve([]));

describe("AccountHistory", () => {
  it("loads account history view with all transactions", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: false,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(4);
    const historyNodeAmounts = screen.getAllByTestId(
      "history-item-amount-component",
    );
    await waitFor(() =>
      expect(historyNodeAmounts[0]).toHaveTextContent("+1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[1]).toHaveTextContent("+0.1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[2]).toHaveTextContent("+0.01 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[3]).toHaveTextContent("-0.1 XLM"),
    );
  });
  it("hides dust transactions", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: true,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(2);
    await waitFor(() => screen.getAllByTestId("history-item"));
    const historyNodeAmounts = screen.getAllByTestId(
      "history-item-amount-component",
    );
    await waitFor(() =>
      expect(historyNodeAmounts[0]).toHaveTextContent("+1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[1]).toHaveTextContent("-0.1 XLM"),
    );
  });
});
