import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { AssetIcon } from "popup/components/account/AccountAssets";

const CODE = "USDT0";
const ISSUER = "GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
const CANONICAL = `${CODE}:${ISSUER}`;
const BROKEN_ICON = "https://ipfs.io/ipfs/bafkreidead";
const WORKING_ICON = "https://docs.usdt0.to/downloads/usdt0/icon.png";

const renderIcon = (assetIcons: Record<string, string | null>) =>
  render(
    <Wrapper routes={[ROUTES.account]}>
      <AssetIcon assetIcons={assetIcons} code={CODE} issuerKey={ISSUER} />
    </Wrapper>,
  );

describe("AssetIcon", () => {
  it("shows a replacement icon after the first one failed to load", () => {
    // retryAssetIcon resolves a new url and pushes it down through assetIcons.
    // If the error state latches, that freshly resolved icon is thrown away and
    // the broken-image glyph stays for the rest of the popup session, making
    // the whole retry path invisible.
    const { rerender } = renderIcon({ [CANONICAL]: BROKEN_ICON });

    fireEvent.error(screen.getByAltText(`${CODE} logo`));

    rerender(
      <Wrapper routes={[ROUTES.account]}>
        <AssetIcon
          assetIcons={{ [CANONICAL]: WORKING_ICON }}
          code={CODE}
          issuerKey={ISSUER}
        />
      </Wrapper>,
    );

    expect(screen.getByAltText(`${CODE} logo`)).toHaveAttribute(
      "src",
      WORKING_ICON,
    );
  });
});
