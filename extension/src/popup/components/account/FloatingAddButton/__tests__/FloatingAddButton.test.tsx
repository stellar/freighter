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
  isHidden,
  networkDetails = MAINNET_NETWORK_DETAILS,
}: {
  activeTab: TabsList;
  canUseFriendbot?: boolean;
  isFunded: boolean;
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
  });
});
