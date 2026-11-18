import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Asset } from "stellar-sdk";

import { Wrapper } from "popup/__testHelpers__";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { ManageAssetRows } from "popup/components/manageAssets/ManageAssetRows";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

jest.mock("popup/components/account/AssetDetail/AssetDetailSheet", () => ({
  AssetDetailSheet: ({
    asset,
  }: {
    asset: { canonical: string; name?: string; contractId?: string } | null;
  }) =>
    asset ? (
      <div
        data-testid="asset-detail-sheet"
        data-name={asset.name}
        data-contract-id={asset.contractId}
      >
        {asset.canonical}
      </div>
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

const renderRows = (
  priceHistory: boolean,
  mainnet: boolean,
  verifiedAssetRows: any[] = [
    { code: "USDC", issuer: ISSUER, domain: "centre.io" },
  ],
) =>
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
        verifiedAssetRows={verifiedAssetRows}
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
  ])("renders a non-clickable body when %s", (_name, priceHistory, mainnet) => {
    renderRows(priceHistory, mainnet);

    const body = screen.getByTestId("ManageAssetRow-USDC-body");
    expect(body).not.toHaveAttribute("role", "button");
    fireEvent.click(body);
    expect(screen.queryByTestId("asset-detail-sheet")).toBeNull();
    expect(screen.getByTestId("ManageAssetRowButton")).toBeInTheDocument();
  });
});

describe("ManageAssetRows row without an issuer or contract", () => {
  it("renders a non-clickable body and opens nothing", () => {
    renderRows(true, true, [{ code: "FOO", issuer: "", domain: null }]);

    const body = screen.getByTestId("ManageAssetRow-FOO-body");
    expect(body).not.toHaveAttribute("role", "button");
    fireEvent.click(body);
    expect(screen.queryByTestId("asset-detail-sheet")).toBeNull();
  });
});

describe("ManageAssetRows descriptor for contract-id rows", () => {
  const USDC_SAC = new Asset("USDC", ISSUER).contractId(
    MAINNET_NETWORK_DETAILS.networkPassphrase,
  );
  const KALE_ID = "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4";

  it("drops name and contractId for a SAC looked up by id", () => {
    renderRows(true, true, [
      {
        code: "USDC",
        issuer: ISSUER,
        contract: USDC_SAC,
        name: `USDC:${ISSUER}`,
        domain: "centre.io",
      },
    ]);

    fireEvent.click(screen.getByTestId("ManageAssetRow-USDC-body"));
    const sheet = screen.getByTestId("asset-detail-sheet");
    expect(sheet).not.toHaveAttribute("data-name");
    expect(sheet).not.toHaveAttribute("data-contract-id");
  });

  it("keeps name and contractId for a non-SAC contract token", () => {
    renderRows(true, true, [
      {
        code: "KALE",
        issuer: KALE_ID,
        contract: KALE_ID,
        name: "Kale",
        domain: "",
      },
    ]);

    fireEvent.click(screen.getByTestId("ManageAssetRow-KALE-body"));
    const sheet = screen.getByTestId("asset-detail-sheet");
    expect(sheet).toHaveAttribute("data-name", "Kale");
    expect(sheet).toHaveAttribute("data-contract-id", KALE_ID);
  });
});
