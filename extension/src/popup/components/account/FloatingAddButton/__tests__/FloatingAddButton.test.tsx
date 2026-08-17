import React from "react";
import { render, screen } from "@testing-library/react";

import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { FloatingAddButton } from "popup/components/account/FloatingAddButton";
import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";

const renderPill = ({
  activeTab,
  canUseFriendbot = false,
  isFunded,
  // Defaults to the ordinary "we know it is unfunded" case; the tests that care
  // about the unknown-funded-state branch pass it explicitly.
  isTokensEmpty = !isFunded,
  isHidden,
  networkDetails = MAINNET_NETWORK_DETAILS,
}: {
  activeTab: TabsList;
  canUseFriendbot?: boolean;
  isFunded: boolean;
  isTokensEmpty?: boolean;
  isHidden: boolean;
  networkDetails?: typeof MAINNET_NETWORK_DETAILS;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{ settings: { networkDetails, networksList: [networkDetails] } }}
    >
      <AccountTabsContext.Provider
        value={{ activeTab, setActiveTab: () => {} }}
      >
        <FloatingAddButton
          canUseFriendbot={canUseFriendbot}
          isFunded={isFunded}
          isTokensEmpty={isTokensEmpty}
          isHidden={isHidden}
          publicKey="GDF3ZEFYPUBLICKEYFORTESTINGONLYAAAAAAAAAAAAAAAAAAAAAAAAA"
          reloadBalances={() => Promise.resolve()}
        />
      </AccountTabsContext.Provider>
    </Wrapper>,
  );

describe("FloatingAddButton", () => {
  // Both tabs empty: each empty state carries its own CTA, so the pill stands
  // down on both of them rather than only on Tokens.
  describe("when the empty states carry the CTAs", () => {
    it.each([TabsList.TOKENS, TabsList.COLLECTIBLES])(
      "renders nothing on the %s tab",
      (activeTab) => {
        const { container } = renderPill({
          activeTab,
          isFunded: false,
          isHidden: true,
        });

        expect(container).toBeEmptyDOMElement();
      },
    );
  });

  describe("when it is the one carrying the CTA", () => {
    it("offers Add token on a funded Tokens tab", () => {
      renderPill({
        activeTab: TabsList.TOKENS,
        isFunded: true,
        isHidden: false,
      });

      expect(screen.getByTestId("add-token-btn")).toHaveTextContent(
        "Add token",
      );
    });

    it("offers Add collectible on the Collectibles tab", () => {
      renderPill({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: true,
        isHidden: false,
      });

      expect(screen.getByTestId("add-collectible-btn")).toHaveTextContent(
        "Add collectible",
      );
    });

    // Adding a token means adding a trustline, which an unfunded account cannot
    // do -- so on the tab whose empty state just handed its action over, the
    // pill offers that same funding action rather than a dead "Add token".
    it("offers funding, not Add token, on an unfunded Tokens tab", () => {
      renderPill({
        activeTab: TabsList.TOKENS,
        isFunded: false,
        isHidden: false,
      });

      expect(screen.getByTestId("fund-account-btn")).toHaveTextContent(
        "Add XLM",
      );
      expect(screen.queryByTestId("add-token-btn")).not.toBeInTheDocument();
    });

    // Same branch the empty state uses, so the pill cannot strand friendbot
    // users on a network where that is the way to fund an account.
    it("offers Friendbot where one is available", () => {
      renderPill({
        activeTab: TabsList.TOKENS,
        canUseFriendbot: true,
        isFunded: false,
        isHidden: false,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });

      expect(screen.getByTestId("fund-account-btn")).toHaveTextContent(
        "Fund with Friendbot",
      );
    });

    // An unfunded account can still hold collectibles, and adding one does not
    // need XLM, so this tab keeps its own action.
    it("still offers Add collectible while unfunded", () => {
      renderPill({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isHidden: false,
      });

      expect(screen.getByTestId("add-collectible-btn")).toBeInTheDocument();
    });

    // The funding pill navigates in this branch, so it has to be a link rather
    // than a button wearing a link's job.
    it("renders the Add XLM funding pill as a link to the funding route", () => {
      renderPill({
        activeTab: TabsList.TOKENS,
        isFunded: false,
        isHidden: false,
      });

      const pill = screen.getByTestId("fund-account-btn");
      expect(pill.tagName).toBe("A");
      expect(pill).toHaveAttribute("href", "/add-funds?isAddXlm=true");
    });

    // Friendbot submits instead of navigating, so that one stays a button.
    it("renders the Friendbot funding pill as a button", () => {
      renderPill({
        activeTab: TabsList.TOKENS,
        canUseFriendbot: true,
        isFunded: false,
        isHidden: false,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });

      expect(screen.getByTestId("fund-account-btn").tagName).toBe("BUTTON");
    });
  });

  // A failed balances fetch leaves the funded state unknown, not unfunded:
  // "Add token" could be impossible and funding could be redundant, so the
  // Tokens tab offers nothing -- which is what it did before this pill existed.
  describe("when the funded state is unknown", () => {
    it("renders nothing on the Tokens tab", () => {
      const { container } = renderPill({
        activeTab: TabsList.TOKENS,
        isFunded: false,
        isTokensEmpty: false,
        isHidden: false,
      });

      expect(container).toBeEmptyDOMElement();
    });

    // Collectibles are unaffected by a balances failure, so that tab keeps its
    // pill rather than losing its only way to add one.
    it("still offers Add collectible", () => {
      renderPill({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isTokensEmpty: false,
        isHidden: false,
      });

      expect(screen.getByTestId("add-collectible-btn")).toBeInTheDocument();
    });
  });
});
