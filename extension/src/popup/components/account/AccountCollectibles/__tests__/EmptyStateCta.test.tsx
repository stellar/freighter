import React from "react";
import { render, screen } from "@testing-library/react";

import { Collection } from "@shared/api/types/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper, mockCollectibles } from "popup/__testHelpers__";
import { AccountCollectibles } from "popup/components/account/AccountCollectibles";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

const renderCollectibles = ({
  collections = [] as Collection[],
  isLoading = false,
  hasError = false,
  isCollectibleHidden = () => false,
}: {
  collections?: Collection[];
  isLoading?: boolean;
  hasError?: boolean;
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
        isLoading={isLoading}
        hasError={hasError}
        refreshHiddenCollectibles={() => Promise.resolve()}
        isCollectibleHidden={isCollectibleHidden}
      />
    </Wrapper>,
  );

describe("Collectibles Add actions", () => {
  // As on mobile, the empty state carries its own button whether or not the
  // account is funded: with nothing in the grid there is nothing to end it.
  it("offers Add collectible inside the empty state", () => {
    renderCollectibles({});

    expect(screen.getByText("Collect your first NFT")).toBeInTheDocument();
    expect(screen.getByTestId("add-collectible-empty-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("add-collectible-btn")).not.toBeInTheDocument();
  });

  // With collectibles on screen the grid ends with the inline button instead,
  // so the two never show together.
  it("ends a populated grid with the inline Add collectible button", () => {
    renderCollectibles({ collections: mockCollectibles });

    expect(screen.getByTestId("add-collectible-btn")).toBeInTheDocument();
    expect(
      screen.queryByTestId("add-collectible-empty-btn"),
    ).not.toBeInTheDocument();
  });

  // An empty `collections` means "owns none" only once the request has resolved.
  // Rendering the empty state before then claims something untrue and then pops
  // the real content in, so the tab shows a spinner until the answer is in.
  // An empty list after a failed fetch is unknown, not empty, so the tab
  // keeps only its Add action.
  describe("when the account fetch failed", () => {
    it("drops the empty card but keeps Add Collectible", () => {
      renderCollectibles({ hasError: true });

      expect(
        screen.queryByText("Collect your first NFT"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("account-collectibles-empty"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId("add-collectible-empty-btn"),
      ).toBeInTheDocument();
    });

    it("still shows collectibles it does have", () => {
      renderCollectibles({ collections: mockCollectibles, hasError: true });

      expect(
        screen.getAllByTestId("account-collectible").length,
      ).toBeGreaterThan(0);
      expect(screen.getByTestId("add-collectible-btn")).toBeInTheDocument();
    });
  });

  describe("while loading", () => {
    it("shows a spinner instead of the empty state", () => {
      renderCollectibles({ isLoading: true });

      expect(
        screen.getByTestId("account-collectibles-loader"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Collect your first NFT"),
      ).not.toBeInTheDocument();
    });

    // Which button it wants is not known yet, so it offers neither.
    it("offers no Add action until the answer is in", () => {
      renderCollectibles({ isLoading: true });

      expect(
        screen.queryByTestId("add-collectible-empty-btn"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("add-collectible-btn"),
      ).not.toBeInTheDocument();
    });

    // The grid would be equally premature: the list is empty because nothing has
    // arrived, not because there is nothing to show.
    it("shows the spinner rather than a partial grid", () => {
      renderCollectibles({
        collections: mockCollectibles,
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
        isCollectibleHidden: () => true,
      });

      expect(screen.getByText("Collect your first NFT")).toBeInTheDocument();
      expect(screen.queryAllByTestId("account-collectible")).toHaveLength(0);
    });

    it("moves the Add action into the empty state", () => {
      renderCollectibles({
        collections: mockCollectibles,
        isCollectibleHidden: () => true,
      });

      expect(
        screen.getByTestId("add-collectible-empty-btn"),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId("add-collectible-btn"),
      ).not.toBeInTheDocument();
    });

    // Only the collections whose every collectible is hidden drop out, so one
    // visible collectible anywhere still means a grid.
    it("keeps the grid while any collectible is still visible", () => {
      const [firstCollection] = mockCollectibles;
      const visibleAddress = firstCollection.collection!.address;

      renderCollectibles({
        collections: mockCollectibles,
        isCollectibleHidden: (collectionAddress) =>
          collectionAddress !== visibleAddress,
      });

      expect(
        screen.queryByText("Collect your first NFT"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("add-collectible-empty-btn"),
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
    const { unmount } = renderCollectibles({});
    const addCollectibleClass = screen
      .getByTestId("add-collectible-empty-btn")
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
