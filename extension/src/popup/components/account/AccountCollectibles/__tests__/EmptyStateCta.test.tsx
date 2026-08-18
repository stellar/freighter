import React from "react";
import { render, screen } from "@testing-library/react";

import { Collection } from "@shared/api/types/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper, mockCollectibles } from "popup/__testHelpers__";
import { AccountCollectibles } from "popup/components/account/AccountCollectibles";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

const renderCollectibles = ({
  collections = [] as Collection[],
  hasInlineCta,
  isLoading = false,
  isCollectibleHidden = () => false,
}: {
  collections?: Collection[];
  hasInlineCta: boolean;
  isLoading?: boolean;
  isCollectibleHidden?: (collectionAddress: string, tokenId: string) => boolean;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{
        settings: {
          networkDetails: TESTNET_NETWORK_DETAILS,
          networksList: [TESTNET_NETWORK_DETAILS],
        },
      }}
    >
      <AccountCollectibles
        collections={collections}
        hasInlineCta={hasInlineCta}
        isLoading={isLoading}
        refreshHiddenCollectibles={() => Promise.resolve()}
        isCollectibleHidden={isCollectibleHidden}
      />
    </Wrapper>,
  );

describe("Collectibles empty-state CTA", () => {
  it("offers Add collectible when it is the tab carrying the action", () => {
    renderCollectibles({ hasInlineCta: true });

    expect(screen.getByText("No collectibles yet")).toBeInTheDocument();
    expect(
      screen.getByTestId("add-collectible-inline-btn"),
    ).toBeInTheDocument();
  });

  // Home clears this whenever the pill is the one carrying this tab's Add action
  // -- the Tokens tab is not showing its empty state, or this tab has
  // collectibles to show -- so the empty state must not double up on it.
  it("drops the CTA when the floating pill is showing instead", () => {
    renderCollectibles({ hasInlineCta: false });

    expect(screen.getByText("No collectibles yet")).toBeInTheDocument();
    expect(
      screen.queryByTestId("add-collectible-inline-btn"),
    ).not.toBeInTheDocument();
  });

  // The CTA belongs to the empty state; with collectibles on screen the pill is
  // the only add affordance, so it must not leak into the populated list.
  it("never renders alongside a populated list", () => {
    renderCollectibles({ collections: mockCollectibles, hasInlineCta: true });

    expect(
      screen.queryByTestId("add-collectible-inline-btn"),
    ).not.toBeInTheDocument();
  });

  // An empty `collections` means "owns none" only once the request has resolved.
  // Rendering the empty state before then claims something untrue and then pops
  // the real content in, so the tab shows a spinner until the answer is in.
  describe("while loading", () => {
    it("shows a spinner instead of the empty state", () => {
      renderCollectibles({ hasInlineCta: false, isLoading: true });

      expect(
        screen.getByTestId("account-collectibles-loader"),
      ).toBeInTheDocument();
      expect(screen.queryByText("No collectibles yet")).not.toBeInTheDocument();
    });

    // Nothing to add to yet, and no empty state to host a button.
    it("offers no inline CTA even when it would otherwise carry one", () => {
      renderCollectibles({ hasInlineCta: true, isLoading: true });

      expect(
        screen.queryByTestId("add-collectible-inline-btn"),
      ).not.toBeInTheDocument();
    });

    // The grid would be equally premature: the list is empty because nothing has
    // arrived, not because there is nothing to show.
    it("shows the spinner rather than a partial grid", () => {
      renderCollectibles({
        collections: mockCollectibles,
        hasInlineCta: false,
        isLoading: true,
      });

      expect(
        screen.getByTestId("account-collectibles-loader"),
      ).toBeInTheDocument();
      expect(screen.queryAllByTestId("account-collectible")).toHaveLength(0);
    });
  });

  // Hiding the last collectible used to leave the tab blank: the grid dropped
  // every collection while this component still thought it had something to
  // show, so neither the grid nor the empty state rendered.
  describe("when every collectible is hidden", () => {
    it("falls back to the empty state rather than rendering nothing", () => {
      renderCollectibles({
        collections: mockCollectibles,
        hasInlineCta: false,
        isCollectibleHidden: () => true,
      });

      expect(screen.getByText("No collectibles yet")).toBeInTheDocument();
      expect(screen.queryAllByTestId("account-collectible")).toHaveLength(0);
    });

    it("still offers the inline CTA when it is the one carrying the action", () => {
      renderCollectibles({
        collections: mockCollectibles,
        hasInlineCta: true,
        isCollectibleHidden: () => true,
      });

      expect(
        screen.getByTestId("add-collectible-inline-btn"),
      ).toBeInTheDocument();
    });

    // Only the collections whose every collectible is hidden drop out, so one
    // visible collectible anywhere still means a grid.
    it("keeps the grid while any collectible is still visible", () => {
      const [firstCollection] = mockCollectibles;
      const visibleAddress = firstCollection.collection!.address;

      renderCollectibles({
        collections: mockCollectibles,
        hasInlineCta: true,
        isCollectibleHidden: (collectionAddress) =>
          collectionAddress !== visibleAddress,
      });

      expect(screen.queryByText("No collectibles yet")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("add-collectible-inline-btn"),
      ).not.toBeInTheDocument();
      expect(screen.queryAllByTestId("account-collectible")).toHaveLength(1);
    });
  });

  // The two empty states sit side by side as tabs, so their CTAs have to be the
  // same button rather than merely similar ones. This pins the SDS side of that
  // -- variant, size and isRounded, via the class SDS computes from them. The
  // weight bump and the 16px offset live in SCSS, which jest maps to a style
  // mock, so those two are verified by the stylesheets themselves, not here.
  it("wears the same button style as the Tokens empty state", () => {
    const { unmount } = renderCollectibles({ hasInlineCta: true });
    const addCollectibleClass = screen
      .getByTestId("add-collectible-inline-btn")
      .getAttribute("class");
    unmount();

    render(
      <Wrapper
        routes={["/"]}
        state={{
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: [TESTNET_NETWORK_DETAILS],
          },
        }}
      >
        <NotFundedMessage
          canUseFriendbot={false}
          publicKey="GDF3ZEFYPUBLICKEYFORTESTINGONLYAAAAAAAAAAAAAAAAAAAAAAAAA"
          reloadBalances={() => Promise.resolve()}
        />
      </Wrapper>,
    );
    const addXlmClass = screen
      .getByRole("button", { name: "Add XLM" })
      .getAttribute("class");

    expect(addCollectibleClass).toBe(addXlmClass);
    expect(addCollectibleClass).toContain("Button--secondary");
  });
});
