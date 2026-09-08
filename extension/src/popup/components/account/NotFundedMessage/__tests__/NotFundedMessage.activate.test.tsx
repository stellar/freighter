import React from "react";
import { render, screen } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";

jest.mock("popup/helpers/reserve/useReserveBootstrap", () => ({
  useReserveBootstrap: () => ({
    options: [
      {
        asset: "USDC:GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2",
        code: "USDC",
        issuer: "GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2",
        available: "25.0000000",
        balanceId: "00".repeat(36),
      },
    ],
    isLoading: false,
  }),
}));

import { NotFundedMessage } from "popup/components/account/NotFundedMessage";

describe("NotFundedMessage token activation", () => {
  it("offers Activate with the waiting token without leaving Freighter", () => {
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
          canUseFriendbot={true}
          publicKey="GDF3ZEFYPUBLICKEYFORTESTINGONLYAAAAAAAAAAAAAAAAAAAAAAAAA"
          reloadBalances={() => Promise.resolve()}
        />
      </Wrapper>,
    );

    expect(screen.getByTestId("activate-with-token")).toHaveTextContent(
      "Activate with 25 USDC",
    );
    expect(
      screen.getByRole("button", { name: "Fund with Friendbot" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Add XLM")).not.toBeInTheDocument();
  });
});
