import React from "react";
import { render, screen } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { FloatingAddButton } from "popup/components/account/FloatingAddButton";
import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";

const renderButton = ({
  activeTab,
  isFunded,
  isCollectiblesCtaInline = false,
  isCollectiblesLoading = false,
  state,
}: {
  activeTab: TabsList;
  isFunded: boolean;
  isCollectiblesCtaInline?: boolean;
  isCollectiblesLoading?: boolean;
  state?: Record<string, unknown>;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: [MAINNET_NETWORK_DETAILS],
        },
        ...state,
      }}
    >
      <AccountTabsContext.Provider
        value={{ activeTab, setActiveTab: () => {} }}
      >
        <FloatingAddButton
          isFunded={isFunded}
          isCollectiblesCtaInline={isCollectiblesCtaInline}
          isCollectiblesLoading={isCollectiblesLoading}
        />
      </AccountTabsContext.Provider>
    </Wrapper>,
  );

describe("FloatingAddButton", () => {
  describe("Tokens tab", () => {
    it("offers Add token once the account is funded", () => {
      renderButton({
        activeTab: TabsList.TOKENS,
        isFunded: true,
        isCollectiblesCtaInline: false,
      });

      expect(screen.getByTestId("add-token-btn")).toHaveTextContent(
        "Add token",
      );
    });

    // Unchanged behaviour: the unfunded empty state carries "Add XLM" itself.
    it("stands down while the account is unfunded", () => {
      const { container } = renderButton({
        activeTab: TabsList.TOKENS,
        isFunded: false,
        isCollectiblesCtaInline: true,
      });

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Positions tab", () => {
    // Regression case: before the Positions tab existed, `!isTokensTab` meant
    // exactly "Collectibles". Inserting a third `TabsList` member without an
    // explicit guard here made it mean "Positions or Collectibles", and for a
    // funded account with collectibles neither loading nor showing an inline
    // CTA (the two props below), the pill fell through to "Add collectible"
    // while the user was looking at the Positions pane. Positions has no add
    // flow of its own -- a position comes from depositing through Earn. This
    // pill offers Deposit instead, gated on the same flag and network as
    // Home's Earn tile.
    it("offers Deposit on the Positions tab when the flag is on", () => {
      renderButton({
        activeTab: TabsList.POSITIONS,
        isFunded: true,
        isCollectiblesCtaInline: false,
        isCollectiblesLoading: false,
        state: { remoteConfig: { earn_deposit: true } },
      });

      expect(screen.getByTestId("deposit-btn")).toHaveTextContent("Deposit");
    });

    it("renders nothing on the Positions tab when the flag is off", () => {
      renderButton({
        activeTab: TabsList.POSITIONS,
        isFunded: true,
        isCollectiblesCtaInline: false,
        isCollectiblesLoading: false,
        state: { remoteConfig: { earn_deposit: false } },
      });

      expect(screen.queryByTestId("deposit-btn")).not.toBeInTheDocument();
    });
  });

  describe("Collectibles tab", () => {
    it("offers Add collectible when its empty state is not carrying the CTA", () => {
      renderButton({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: true,
        isCollectiblesCtaInline: false,
      });

      expect(screen.getByTestId("add-collectible-btn")).toHaveTextContent(
        "Add collectible",
      );
    });

    // The half that makes the two tabs agree: with Tokens showing its inline
    // CTA, this tab shows one too, so the pill would be a second call to action.
    it("stands down when its empty state is carrying the CTA", () => {
      const { container } = renderButton({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isCollectiblesCtaInline: true,
      });

      expect(container).toBeEmptyDOMElement();
    });

    // While that tab is loading it shows a spinner, and which kind of button it
    // wants is not known yet, so the pill waits rather than appearing and then
    // being replaced by the inline CTA.
    it("stands down while that tab is still loading", () => {
      const { container } = renderButton({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isCollectiblesLoading: true,
      });

      expect(container).toBeEmptyDOMElement();
    });

    // The Tokens tab is unaffected by any of this -- it never reads the
    // collectibles state.
    it("still offers Add token while Collectibles is loading", () => {
      renderButton({
        activeTab: TabsList.TOKENS,
        isFunded: true,
        isCollectiblesLoading: true,
      });

      expect(screen.getByTestId("add-token-btn")).toBeInTheDocument();
    });

    // An unfunded account can still hold collectibles, in which case this tab has
    // no empty state to host a CTA and must keep the pill rather than lose its
    // only way to add one.
    it("keeps the pill while unfunded if there is no inline CTA to replace it", () => {
      renderButton({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isCollectiblesCtaInline: false,
      });

      expect(screen.getByTestId("add-collectible-btn")).toBeInTheDocument();
    });
  });
});
