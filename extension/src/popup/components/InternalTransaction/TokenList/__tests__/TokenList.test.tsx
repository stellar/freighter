import React from "react";
import { render, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

import { TokenList } from "../index";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock("popup/components/account/AccountAssets", () => ({
  AssetIcon: () => <div data-testid="asset-icon" />,
}));

const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const AQUA_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const USDC_CANONICAL = `USDC:${USDC_ISSUER}`;
const AQUA_CANONICAL = `AQUA:${AQUA_ISSUER}`;

const XLM_BALANCE = {
  token: { code: "XLM", type: "native" as const },
  total: new BigNumber("500"),
  available: new BigNumber("500"),
  blockaidData: defaultBlockaidScanAssetResult,
};

const USDC_BALANCE = {
  token: {
    code: "USDC",
    issuer: { key: USDC_ISSUER },
  },
  total: new BigNumber("200"),
  available: new BigNumber("200"),
  blockaidData: defaultBlockaidScanAssetResult,
};

const AQUA_BALANCE = {
  token: {
    code: "AQUA",
    issuer: { key: AQUA_ISSUER },
  },
  total: new BigNumber("10000"),
  available: new BigNumber("10000"),
  blockaidData: defaultBlockaidScanAssetResult,
};

const LP_BALANCE = {
  liquidityPoolId:
    "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088",
  total: new BigNumber("10"),
  limit: new BigNumber("100"),
};

const TOKEN_PRICES = {
  native: { currentPrice: "0.10" },
  [USDC_CANONICAL]: { currentPrice: "1.00" },
  [AQUA_CANONICAL]: { currentPrice: "0.005" },
};

const defaultProps = {
  icons: {},
  tokenPrices: TOKEN_PRICES,
  onClickAsset: jest.fn(),
  hiddenAssets: [] as string[],
};

describe("TokenList", () => {
  describe("value sort ordering", () => {
    it("renders tokens in descending USD value order", () => {
      // USDC: 200 * 1.00 = $200
      // XLM: 500 * 0.10 = $50
      // AQUA: 10000 * 0.005 = $50 (tie with XLM, preserves input order)
      const tokens = [XLM_BALANCE, USDC_BALANCE, AQUA_BALANCE] as any[];

      render(<TokenList {...defaultProps} tokens={tokens} />);

      const rows = screen.getAllByTestId(/^SendRow-/);
      expect(rows[0]).toHaveAttribute("data-testid", `SendRow-${USDC_CANONICAL}`);
      expect(rows[1]).toHaveAttribute("data-testid", "SendRow-native");
      expect(rows[2]).toHaveAttribute("data-testid", `SendRow-${AQUA_CANONICAL}`);
    });

    it("preserves original order when tokenPrices is empty", () => {
      const tokens = [XLM_BALANCE, USDC_BALANCE, AQUA_BALANCE] as any[];

      render(<TokenList {...defaultProps} tokens={tokens} tokenPrices={{}} />);

      const rows = screen.getAllByTestId(/^SendRow-/);
      expect(rows[0]).toHaveAttribute("data-testid", "SendRow-native");
      expect(rows[1]).toHaveAttribute("data-testid", `SendRow-${USDC_CANONICAL}`);
      expect(rows[2]).toHaveAttribute("data-testid", `SendRow-${AQUA_CANONICAL}`);
    });

    it("sorts priced assets before unpriced ones", () => {
      const partialPrices = {
        [USDC_CANONICAL]: { currentPrice: "1.00" },
      };
      const tokens = [XLM_BALANCE, AQUA_BALANCE, USDC_BALANCE] as any[];

      render(
        <TokenList {...defaultProps} tokens={tokens} tokenPrices={partialPrices} />,
      );

      const rows = screen.getAllByTestId(/^SendRow-/);
      // USDC (priced) comes first
      expect(rows[0]).toHaveAttribute("data-testid", `SendRow-${USDC_CANONICAL}`);
      // Unpriced assets preserve input order
      expect(rows[1]).toHaveAttribute("data-testid", "SendRow-native");
      expect(rows[2]).toHaveAttribute("data-testid", `SendRow-${AQUA_CANONICAL}`);
    });
  });

  describe("filtering", () => {
    it("excludes LP share assets from the list", () => {
      const tokens = [XLM_BALANCE, LP_BALANCE, USDC_BALANCE] as any[];

      render(<TokenList {...defaultProps} tokens={tokens} />);

      const rows = screen.getAllByTestId(/^SendRow-/);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveAttribute("data-testid", `SendRow-${USDC_CANONICAL}`);
      expect(rows[1]).toHaveAttribute("data-testid", "SendRow-native");
    });

    it("excludes hidden assets from the list", () => {
      const tokens = [XLM_BALANCE, USDC_BALANCE, AQUA_BALANCE] as any[];
      const hiddenAssets = [USDC_CANONICAL];

      render(
        <TokenList {...defaultProps} tokens={tokens} hiddenAssets={hiddenAssets} />,
      );

      const rows = screen.getAllByTestId(/^SendRow-/);
      expect(rows).toHaveLength(2);
      // USDC is hidden, XLM and AQUA remain (sorted by value)
      expect(rows[0]).toHaveAttribute("data-testid", "SendRow-native");
      expect(rows[1]).toHaveAttribute("data-testid", `SendRow-${AQUA_CANONICAL}`);
    });
  });

  it("shows empty state when no tokens provided", () => {
    render(<TokenList {...defaultProps} tokens={[]} />);

    expect(
      screen.getByText(
        "You have no assets added. Get started by adding an asset.",
      ),
    ).toBeDefined();
  });
});
