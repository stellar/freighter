import { render, screen } from "@testing-library/react";
import React from "react";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { Wrapper } from "popup/__testHelpers__";

const XLM_CODED_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const FETCHED_ICON = "https://example.test/icon.png";

// Bundled images resolve to this stub under the Jest file mock, so a rendered
// src of "test-file-stub" means the bundled Stellar logo was chosen.
const BUNDLED_LOGO = "test-file-stub";

const renderIcon = (props: {
  code: string;
  issuerKey?: string;
  assetIcons: Record<string, string>;
}) =>
  render(
    <Wrapper state={{}} routes={["/"]}>
      <AssetIcon {...props} />
    </Wrapper>,
  );

describe("AssetIcon", () => {
  it("shows the bundled logo for the native asset", () => {
    renderIcon({ code: "XLM", assetIcons: {} });

    expect(screen.getByAltText("XLM logo")).toHaveAttribute(
      "src",
      BUNDLED_LOGO,
    );
  });

  it("shows the fetched icon for a classic asset that uses the native code", () => {
    renderIcon({
      code: "XLM",
      issuerKey: XLM_CODED_ISSUER,
      assetIcons: { [`XLM:${XLM_CODED_ISSUER}`]: FETCHED_ICON },
    });

    expect(screen.getByAltText("XLM logo")).toHaveAttribute(
      "src",
      FETCHED_ICON,
    );
  });
});
