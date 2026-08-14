import React from "react";
import { render, screen } from "@testing-library/react";

import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

const renderMessage = ({
  canUseFriendbot,
  networkDetails = TESTNET_NETWORK_DETAILS,
}: {
  canUseFriendbot: boolean;
  networkDetails?: typeof TESTNET_NETWORK_DETAILS;
}) =>
  render(
    <Wrapper
      routes={["/"]}
      state={{ settings: { networkDetails, networksList: [networkDetails] } }}
    >
      <NotFundedMessage
        canUseFriendbot={canUseFriendbot}
        publicKey="GDF3ZEFYPUBLICKEYFORTESTINGONLYAAAAAAAAAAAAAAAAAAAAAAAAA"
        reloadBalances={() => Promise.resolve()}
      />
    </Wrapper>,
  );

describe("NotFundedMessage funding action", () => {
  // The two used to stack: "Add XLM" always rendered and Friendbot was
  // appended below it, so test networks showed two competing funding buttons.
  it("offers only Friendbot where one is available", () => {
    renderMessage({ canUseFriendbot: true });

    expect(
      screen.getByRole("button", { name: "Fund with Friendbot" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Add XLM")).not.toBeInTheDocument();
    expect(
      screen.getByTestId("not-funded").querySelectorAll("button"),
    ).toHaveLength(1);
  });

  it("offers only Add XLM where there is no friendbot", () => {
    renderMessage({
      canUseFriendbot: false,
      networkDetails: MAINNET_NETWORK_DETAILS,
    });

    expect(screen.getByText("Add XLM")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fund with Friendbot" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("not-funded").querySelectorAll("button"),
    ).toHaveLength(1);
  });

  // Friendbot is the primary action of this empty state where it exists, so
  // it has to look like the button it replaced rather than a lesser variant.
  it("styles both funding buttons identically", () => {
    const { unmount } = renderMessage({ canUseFriendbot: true });
    const friendbotClass = screen
      .getByRole("button", { name: "Fund with Friendbot" })
      .getAttribute("class");
    unmount();

    renderMessage({
      canUseFriendbot: false,
      networkDetails: MAINNET_NETWORK_DETAILS,
    });
    const addXlmClass = screen
      .getByRole("button", { name: "Add XLM" })
      .getAttribute("class");

    expect(friendbotClass).toBe(addXlmClass);
    expect(friendbotClass).toContain("Button--secondary");
  });
});
