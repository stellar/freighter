import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { SecurityLevel } from "popup/constants/blockaid";
import { SwapTokenRow } from "../index";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("popup/components/account/AccountAssets", () => ({
  AssetIcon: () => <div data-testid="asset-icon" />,
}));

const mockOpenTab = jest.fn();
jest.mock("popup/helpers/navigate", () => ({
  openTab: (...args: unknown[]) => mockOpenTab(...args),
}));

const AQUA_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const baseProps = {
  code: "AQUA",
  issuerKey: AQUA_ISSUER,
  domain: "aqua.network",
  iconUrl: "",
  onClick: jest.fn(),
  stellarExpertUrl: "https://stellar.expert/explorer/public",
};

describe("SwapTokenRow", () => {
  afterEach(() => jest.clearAllMocks());

  it("held row shows fiat value and 24h change, no context menu", () => {
    render(
      <SwapTokenRow
        {...baseProps}
        isHeld
        fiatValue="$1,234.56"
        percentChange24h="+1.23%"
      />,
    );

    expect(screen.getByTestId("SwapTokenRow-AQUA-fiat")).toHaveTextContent(
      "$1,234.56",
    );
    expect(screen.getByTestId("SwapTokenRow-AQUA-change")).toHaveTextContent(
      "+1.23%",
    );
    expect(screen.queryByTestId("SwapTokenRow-AQUA-menu")).toBeNull();
  });

  it("non-held row shows context menu and no fiat value", () => {
    render(<SwapTokenRow {...baseProps} isHeld={false} />);

    expect(screen.queryByTestId("SwapTokenRow-AQUA-fiat")).toBeNull();
    expect(screen.getByTestId("SwapTokenRow-AQUA-menu")).toBeInTheDocument();
  });

  it("renders the ScamAssetIcon badge when malicious in non-held variant", () => {
    render(
      <SwapTokenRow
        {...baseProps}
        isHeld={false}
        securityLevel={SecurityLevel.MALICIOUS}
      />,
    );

    expect(screen.getByTestId("ScamAssetIcon")).toBeInTheDocument();
  });

  it("does not render the ScamAssetIcon badge when held, even if malicious", () => {
    render(
      <SwapTokenRow
        {...baseProps}
        isHeld
        securityLevel={SecurityLevel.MALICIOUS}
      />,
    );

    expect(screen.queryByTestId("ScamAssetIcon")).toBeNull();
  });

  it("does not render the badge when safe", () => {
    render(
      <SwapTokenRow
        {...baseProps}
        isHeld={false}
        securityLevel={SecurityLevel.SAFE}
      />,
    );

    expect(screen.queryByTestId("ScamAssetIcon")).toBeNull();
  });

  it("calls onClick when the row body is clicked", () => {
    const onClick = jest.fn();
    render(<SwapTokenRow {...baseProps} isHeld onClick={onClick} />);

    fireEvent.click(screen.getByTestId("SwapTokenRow-AQUA-body"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("View on stellar.expert opens the asset page in a new tab", () => {
    render(<SwapTokenRow {...baseProps} isHeld={false} />);

    fireEvent.click(screen.getByTestId("SwapTokenRow-AQUA-menu"));
    fireEvent.click(screen.getByTestId("SwapTokenRow-AQUA-view-expert"));

    expect(mockOpenTab).toHaveBeenCalledWith(
      `https://stellar.expert/explorer/public/asset/AQUA-${AQUA_ISSUER}`,
    );
  });
});
