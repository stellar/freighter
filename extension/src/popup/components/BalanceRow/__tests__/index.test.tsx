import { render, screen } from "@testing-library/react";
import React from "react";

import { BalanceRow } from "popup/components/BalanceRow";
import { Wrapper } from "popup/__testHelpers__";

// A real classic-asset issuer that happens to use the native display code.
const XLM_CODED_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const FETCHED_ICON = "https://example.test/icon.png";

// Bundled images resolve to this stub under the Jest file mock, so a rendered
// src of "test-file-stub" means the bundled Stellar logo was chosen.
const BUNDLED_LOGO = "test-file-stub";

const renderRow = (props: Partial<React.ComponentProps<typeof BalanceRow>>) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <BalanceRow code="XLM" amount="100" {...props} />
    </Wrapper>,
  );

describe("BalanceRow", () => {
  it("renders the bundled logo for the genuine native asset (control)", () => {
    renderRow({});

    expect(
      screen.queryByTestId("AccountAssets__asset--loading"),
    ).not.toBeInTheDocument();
    expect(screen.getByAltText("XLM logo")).toHaveAttribute(
      "src",
      BUNDLED_LOGO,
    );
  });

  // Pins the hazard documented in BalanceRow's own comment: AssetIcon shows a
  // perpetual loading state when `assetIcons` is empty and the asset isn't
  // native. A classic asset that happens to use the "XLM" display code but
  // carries a real issuer is not native, so with no `assetIcons` prop at all
  // (the caller has nothing to pass), BalanceRow must synthesize a one-entry
  // map from `iconUrl` rather than leaving AssetIcon to fetch forever.
  it("renders the fetched icon for a classic asset that uses the native code, with no assetIcons prop", () => {
    renderRow({
      issuerKey: XLM_CODED_ISSUER,
      iconUrl: FETCHED_ICON,
    });

    expect(
      screen.queryByTestId("AccountAssets__asset--loading"),
    ).not.toBeInTheDocument();
    expect(screen.getByAltText("XLM logo")).toHaveAttribute(
      "src",
      FETCHED_ICON,
    );
  });
});
