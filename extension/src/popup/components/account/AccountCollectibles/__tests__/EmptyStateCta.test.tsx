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
}: {
  collections?: Collection[];
  hasInlineCta: boolean;
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
        refreshHiddenCollectibles={() => Promise.resolve()}
        isCollectibleHidden={() => false}
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

  // The floating pill covers both tabs once either one has something to show,
  // so the inline CTA has to stand down rather than double up on it.
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
          hasInlineCta
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
