import { ProtocolEntry } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { SwapRoute } from "@shared/api/types/backend-api";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";

import StellarLogo from "popup/assets/stellar-logo.png";

import {
  buildRouteView,
  formatShare,
  resolveRouteToken,
  resolveVenue,
  RouteTokenContext,
} from "../routeViewModel";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const EURC_ISSUER = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
const EURC = `EURC:${EURC_ISSUER}`;
const KALE = "CB23WRDQWGSP6YPMY4UV5C4OW5CBTXKYN3XEATG7KJEZCXMJBYEHOUOV";
const UNKNOWN_CONTRACT =
  "CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR";

const protocol = (name: string, iconUrl: string): ProtocolEntry => ({
  name,
  iconUrl,
  description: "",
  websiteUrl: "",
  tags: [],
  isBlacklisted: false,
  isTrending: false,
});

const PROTOCOLS = [
  protocol("Aquarius", "https://icons.test/aquarius.png"),
  protocol("SushiSwap", "https://icons.test/sushi.png"),
  protocol("Soroswap", "https://icons.test/soroswap.png"),
];

const emptyContext: RouteTokenContext = {
  known: {},
  icons: {},
  balances: [],
  tokenLists: [],
};

const lifiRoute: SwapRoute = {
  source: "lifi",
  fromAmount: "1000",
  toAmount: "370",
  fees: [],
  paths: [
    {
      share: "0.32",
      hops: [
        { venue: "Aquarius", from: "XLM", to: EURC, pool: "p1" },
        { venue: "SushiSwap", from: EURC, to: KALE, pool: "p2" },
        { venue: "Soroswap", from: KALE, to: USDC, pool: "p3" },
      ],
    },
    {
      share: "0.68",
      hops: [
        { venue: "Soroswap", from: "XLM", to: EURC, pool: "p4" },
        { venue: "Aquarius", from: EURC, to: USDC, pool: "p5" },
      ],
    },
  ],
};

const classicRoute: SwapRoute = {
  source: "classic",
  fromAmount: "1000",
  toAmount: "371",
  fees: [],
  paths: [
    {
      share: "1",
      hops: [
        { venue: "stellar-dex", from: "XLM", to: EURC },
        { venue: "stellar-dex", from: EURC, to: USDC },
      ],
    },
  ],
};

describe("formatShare", () => {
  it.each([
    ["0.32", "32%"],
    ["1", "100%"],
    ["0.125", "13%"],
    ["0.004", "<1%"],
    ["0", "0%"],
    ["junk", "0%"],
  ])("formats %s as %s", (share, expected) => {
    expect(formatShare(share)).toBe(expected);
  });
});

describe("buildRouteView", () => {
  it("counts a path's pools as its hops", () => {
    const view = buildRouteView({
      route: lifiRoute,
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.isClassic).toBe(false);
    expect(view.paths.map((p) => p.poolCount)).toEqual([3, 2]);
    expect(view.paths.map((p) => p.share)).toEqual(["32%", "68%"]);
  });

  it("lists each venue once across all paths, in first-seen order", () => {
    const view = buildRouteView({
      route: lifiRoute,
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.providers.map((p) => p.name)).toEqual([
      "Aquarius",
      "SushiSwap",
      "Soroswap",
    ]);
    expect(view.providers[0].icon).toBe("https://icons.test/aquarius.png");
  });

  it("orders a path's tokens with each venue between its two tokens", () => {
    const view = buildRouteView({
      route: lifiRoute,
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    const [first] = view.paths;
    expect(first.tokens.map((t) => t.code)).toEqual([
      "XLM",
      "EURC",
      "CB23…OUOV",
      "USDC",
    ]);
    expect(first.venues.map((v) => v.name)).toEqual([
      "Aquarius",
      "SushiSwap",
      "Soroswap",
    ]);
    expect(view.from.code).toBe("XLM");
    expect(view.to.code).toBe("USDC");
  });

  it("drops the pool count on a classic route and shows its one path whole", () => {
    const view = buildRouteView({
      route: classicRoute,
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.isClassic).toBe(true);
    expect(view.paths).toHaveLength(1);
    expect(view.paths[0].poolCount).toBeNull();
    expect(view.paths[0].share).toBe("100%");
    expect(view.providers).toEqual([
      { name: "Stellar DEX", icon: StellarLogo },
    ]);
  });

  it("shows pools only on paths whose hops carry one", () => {
    const view = buildRouteView({
      route: {
        ...lifiRoute,
        paths: [
          lifiRoute.paths[0],
          {
            share: "0.68",
            hops: [{ venue: "stellar-dex", from: "XLM", to: USDC }],
          },
        ],
      },
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.paths.map((p) => p.poolCount)).toEqual([3, null]);
  });

  it("counts only the hops that carry a pool", () => {
    const view = buildRouteView({
      route: {
        ...lifiRoute,
        paths: [
          {
            share: "1",
            hops: [
              { venue: "Aquarius", from: "XLM", to: EURC, pool: "p1" },
              { venue: "stellar-dex", from: EURC, to: USDC },
            ],
          },
        ],
      },
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.paths[0].poolCount).toBe(1);
  });

  it("gives a venue /protocols doesn't list no icon", () => {
    const view = buildRouteView({
      route: {
        ...classicRoute,
        paths: [
          {
            share: "1",
            hops: [{ venue: "Mystery AMM", from: "XLM", to: USDC }],
          },
        ],
      },
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.paths[0].venues[0]).toEqual({
      name: "Mystery AMM",
      icon: null,
    });
  });

  it("names stellar-dex in any casing Stellar DEX, as mobile does", () => {
    expect(resolveVenue(" Stellar-DEX ", PROTOCOLS)).toEqual({
      name: "Stellar DEX",
      icon: StellarLogo,
    });
  });

  it("names stellar-dex Stellar DEX with the Stellar logo, once in Providers", () => {
    const view = buildRouteView({
      route: classicRoute,
      tokenContext: emptyContext,
      protocols: PROTOCOLS,
    })!;
    expect(view.paths[0].venues).toEqual([
      { name: "Stellar DEX", icon: StellarLogo },
      { name: "Stellar DEX", icon: StellarLogo },
    ]);
    expect(view.providers).toEqual([
      { name: "Stellar DEX", icon: StellarLogo },
    ]);
  });

  it("is null for a missing route or one with no paths", () => {
    expect(
      buildRouteView({
        route: null,
        tokenContext: emptyContext,
        protocols: [],
      }),
    ).toBeNull();
    expect(
      buildRouteView({
        route: { ...lifiRoute, paths: [] },
        tokenContext: emptyContext,
        protocols: [],
      }),
    ).toBeNull();
  });
});

describe("resolveRouteToken", () => {
  it("keeps a code that contains a colon whole", () => {
    expect(resolveRouteToken(`MY:TOKEN:${KALE}`, emptyContext)).toMatchObject({
      code: "MY:TOKEN",
      issuer: KALE,
      canonical: `MY:TOKEN:${KALE}`,
    });
  });

  it("names an unknown contract token by its shortened contract ID", () => {
    expect(resolveRouteToken(UNKNOWN_CONTRACT, emptyContext)).toEqual({
      code: "CADQ…P5KR",
      issuer: UNKNOWN_CONTRACT,
      canonical: `CADQ…P5KR:${UNKNOWN_CONTRACT}`,
      icon: null,
    });
  });

  it("names a held contract token by its code", () => {
    const balances = [
      {
        token: { code: "KALE", issuer: { key: KALE } },
        contractId: KALE,
        decimals: 7,
        total: "1",
        available: "1",
      },
    ] as unknown as AssetType[];
    const token = resolveRouteToken(KALE, { ...emptyContext, balances });
    expect(token.code).toBe("KALE");
    expect(token.canonical).toBe(`KALE:${KALE}`);
  });

  it("names and pictures a listed contract token from the asset list", () => {
    const tokenLists = [
      {
        assets: [
          {
            code: "KALE",
            issuer: "",
            contract: KALE,
            icon: "https://icons.test/kale.png",
            domain: "",
            decimals: 7,
          },
        ],
      },
    ] as unknown as AssetListResponse[];
    expect(resolveRouteToken(KALE, { ...emptyContext, tokenLists })).toEqual({
      code: "KALE",
      issuer: KALE,
      canonical: `KALE:${KALE}`,
      icon: "https://icons.test/kale.png",
    });
  });

  it("prefers the wallet's icon for a classic asset, then the asset list", () => {
    const tokenLists = [
      {
        assets: [
          {
            code: "EURC",
            issuer: EURC_ISSUER,
            icon: "https://icons.test/eurc-list.png",
            domain: "",
            decimals: 7,
          },
        ],
      },
    ] as unknown as AssetListResponse[];
    expect(resolveRouteToken(EURC, { ...emptyContext, tokenLists }).icon).toBe(
      "https://icons.test/eurc-list.png",
    );
    expect(
      resolveRouteToken(EURC, {
        ...emptyContext,
        tokenLists,
        icons: { [EURC]: "https://icons.test/eurc-cache.png" },
      }).icon,
    ).toBe("https://icons.test/eurc-cache.png");
  });

  it("uses the screen's own token for the sold and bought assets", () => {
    const known = {
      XLM: { code: "XLM", issuer: "", canonical: "native", icon: null },
      [USDC]: {
        code: "USDC",
        issuer: USDC_ISSUER,
        canonical: USDC,
        icon: "https://icons.test/usdc.png",
      },
    };
    expect(resolveRouteToken(USDC, { ...emptyContext, known }).icon).toBe(
      "https://icons.test/usdc.png",
    );
  });
});
