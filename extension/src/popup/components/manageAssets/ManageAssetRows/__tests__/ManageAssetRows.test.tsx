import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { ManageAssetRows } from "popup/components/manageAssets/ManageAssetRows";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

jest.mock("popup/components/account/AssetDetail/AssetDetailSheet", () => ({
  AssetDetailSheet: ({ asset }: { asset: { canonical: string } | null }) =>
    asset ? (
      <div data-testid="asset-detail-sheet">{asset.canonical}</div>
    ) : null,
}));

jest.mock("popup/components/manageAssets/ManageAssetRowButton", () => ({
  ManageAssetRowButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="ManageAssetRowButton" onClick={onClick} />
  ),
}));

jest.mock("../ChangeTrustInternal", () => ({
  ChangeTrustInternal: () => <div data-testid="change-trust" />,
}));

const renderRows = (priceHistory: boolean, mainnet: boolean) =>
  render(
    <Wrapper
      state={{
        settings: {
          networkDetails: mainnet
            ? MAINNET_NETWORK_DETAILS
            : TESTNET_NETWORK_DETAILS,
        },
        remoteConfig: {
          isInitialized: true,
          use_balances_v2: false,
          use_token_price_history: priceHistory,
          maintenance_banner: { enabled: false, payload: undefined },
          maintenance_screen: { enabled: false, payload: undefined },
        },
      }}
      routes={["/"]}
    >
      <ManageAssetRows
        verifiedAssetRows={[
          { code: "USDC", issuer: ISSUER, domain: "centre.io" },
        ]}
        unverifiedAssetRows={[]}
        balances={
          { balances: [], subentryCount: 0, localOnlyTokenIds: [] } as any
        }
      />
    </Wrapper>,
  );

describe("ManageAssetRows row tap", () => {
  it("opens the detail sheet when the row body is clicked and leaves the Add button alone", () => {
    renderRows(true, true);

    fireEvent.click(screen.getByTestId("ManageAssetRow-USDC-body"));
    expect(screen.getByTestId("asset-detail-sheet")).toHaveTextContent(
      `USDC:${ISSUER}`,
    );

    expect(screen.getByTestId("ManageAssetRowButton")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("ManageAssetRowButton"));
    expect(screen.getByTestId("change-trust")).toBeInTheDocument();
  });

  it.each([
    ["price history is off", false, true],
    ["off-mainnet", true, false],
  ])(
    "renders a non-clickable body when %s",
    (_name, priceHistory, mainnet) => {
      renderRows(priceHistory, mainnet);

      const body = screen.getByTestId("ManageAssetRow-USDC-body");
      expect(body).not.toHaveAttribute("role", "button");
      fireEvent.click(body);
      expect(screen.queryByTestId("asset-detail-sheet")).toBeNull();
      expect(screen.getByTestId("ManageAssetRowButton")).toBeInTheDocument();
    },
  );
});
