import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TFunction } from "i18next";

import { Wrapper } from "popup/__testHelpers__";
import { SecurityLevel } from "popup/constants/blockaid";
import { BlockaidBanner, getBlockaidBannerTitle } from "../index";

// en translations use the English string as both key and value, so an identity
// function stands in for `t` when unit-testing the resolver.
const t = ((key: string) => key) as unknown as TFunction;

describe("getBlockaidBannerTitle", () => {
  it("distinguishes aggregate-token from single-token wording", () => {
    expect(
      getBlockaidBannerTitle(t, "tokenAggregate", SecurityLevel.MALICIOUS),
    ).toBe("A token was flagged as malicious");
    expect(getBlockaidBannerTitle(t, "token", SecurityLevel.SUSPICIOUS)).toBe(
      "This token was flagged as suspicious",
    );
  });

  it("covers transaction, address and site entities", () => {
    expect(
      getBlockaidBannerTitle(t, "transaction", SecurityLevel.MALICIOUS),
    ).toBe("This transaction was flagged as malicious");
    expect(getBlockaidBannerTitle(t, "address", SecurityLevel.SUSPICIOUS)).toBe(
      "This address was flagged as suspicious",
    );
    expect(getBlockaidBannerTitle(t, "site", SecurityLevel.MALICIOUS)).toBe(
      "This site was flagged as malicious",
    );
  });

  it("uses a soft caution title for unable-to-scan (site gets its own copy)", () => {
    expect(
      getBlockaidBannerTitle(t, "token", SecurityLevel.UNABLE_TO_SCAN),
    ).toBe("Proceed with caution");
    expect(
      getBlockaidBannerTitle(t, "site", SecurityLevel.UNABLE_TO_SCAN),
    ).toBe("Unable to scan site for malicious behavior");
  });
});

describe("BlockaidBanner", () => {
  const renderBanner = (props: React.ComponentProps<typeof BlockaidBanner>) =>
    render(
      <Wrapper state={{}} routes={["/"]}>
        <BlockaidBanner {...props} />
      </Wrapper>,
    );

  it("renders nothing for a SAFE verdict", () => {
    renderBanner({ securityLevel: SecurityLevel.SAFE, entity: "token" });
    expect(screen.queryByTestId("blockaid-banner")).toBeNull();
  });

  it("renders the malicious (red) variant and fires onClick", () => {
    const onClick = jest.fn();
    renderBanner({
      securityLevel: SecurityLevel.MALICIOUS,
      entity: "transaction",
      onClick,
    });
    const banner = screen.getByTestId("blockaid-banner");
    expect(banner.className).toContain("BlockaidBanner--malicious");
    expect(banner).toHaveTextContent(
      "This transaction was flagged as malicious",
    );
    fireEvent.click(banner);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the caution (amber) variant for a suspicious aggregate token", () => {
    renderBanner({
      securityLevel: SecurityLevel.SUSPICIOUS,
      entity: "tokenAggregate",
    });
    const banner = screen.getByTestId("blockaid-banner");
    expect(banner.className).toContain("BlockaidBanner--caution");
    expect(banner).toHaveTextContent("A token was flagged as suspicious");
  });
});
