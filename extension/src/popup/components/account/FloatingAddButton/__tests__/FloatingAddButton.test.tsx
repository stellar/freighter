import React from "react";
import { render, screen } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { FloatingAddButton } from "popup/components/account/FloatingAddButton";
import {
  AccountTabsContext,
  TabsList,
} from "popup/views/Account/contexts/activeTabContext";

const renderPill = ({
  activeTab,
  isFunded,
  isCollectiblesCtaInline = false,
  isCollectiblesLoading = false,
}: {
  activeTab: TabsList;
  isFunded: boolean;
  isCollectiblesCtaInline?: boolean;
  isCollectiblesLoading?: boolean;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        settings: {
          networkDetails: MAINNET_NETWORK_DETAILS,
          networksList: [MAINNET_NETWORK_DETAILS],
        },
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
      renderPill({
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
      const { container } = renderPill({
        activeTab: TabsList.TOKENS,
        isFunded: false,
        isCollectiblesCtaInline: true,
      });

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("Collectibles tab", () => {
    it("offers Add collectible when its empty state is not carrying the CTA", () => {
      renderPill({
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
      const { container } = renderPill({
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
      const { container } = renderPill({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isCollectiblesLoading: true,
      });

      expect(container).toBeEmptyDOMElement();
    });

    // The Tokens tab is unaffected by any of this -- it never reads the
    // collectibles state.
    it("still offers Add token while Collectibles is loading", () => {
      renderPill({
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
      renderPill({
        activeTab: TabsList.COLLECTIBLES,
        isFunded: false,
        isCollectiblesCtaInline: false,
      });

      expect(screen.getByTestId("add-collectible-btn")).toBeInTheDocument();
    });
  });
});
