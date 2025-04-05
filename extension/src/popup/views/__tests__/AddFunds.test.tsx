import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import browser from "webextension-polyfill";

import * as ApiInternal from "@shared/api/internal";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { AddFunds } from "../AddFunds";

const token = "foo";

jest.mock("webextension-polyfill", () => ({
  tabs: {
    create: jest.fn(),
  },
}));

// @ts-ignore
jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    tokenIdList: ["C1"],
    hasPrivateKey: false,
    applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "foo",
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
