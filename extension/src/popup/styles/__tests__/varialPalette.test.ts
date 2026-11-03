import * as fs from "fs";
import * as path from "path";

/**
 * Guards for the Varial palette swap (freighter-private#37).
 *
 * The UI must take every color from SDS `--sds-clr-*` tokens so that #18's
 * theme switching (flipping the body's `.sds-theme-*` class) re-themes every
 * surface. These tests scan the source rather than render it: a hardcoded
 * color renders fine today and only breaks when the theme flips.
 */

const POPUP_ROOT = path.join(__dirname, "..", "..");
const SRC_ROOT = path.join(POPUP_ROOT, "..");
const PALETTE_FILE = path.join(POPUP_ROOT, "styles", "varialPalette.scss");

// Varial Blue ramp from design's Varial spec; identical to the values mobile
// shipped in freighter-mobile-private#26.
const VARIAL_LILAC: Record<"light" | "dark", string[]> = {
  light: [
    "#fcfdff",
    "#f5faff",
    "#eef4ff",
    "#daeaff",
    "#c8e0ff",
    "#a8c6ff",
    "#98bfff",
    "#73a5ff",
    "#0050ff",
    "#0246df",
    "#0f53ec",
    "#0e2b6c",
  ],
  dark: [
    "#0e1623",
    "#101a29",
    "#0d264d",
    "#092f69",
    "#0f3b7c",
    "#19478d",
    "#2255a3",
    "#2865c1",
    "#1677ff",
    "#0069f0",
    "#7eb6ff",
    "#cde3ff",
  ],
};

// The Freighter lilac ramps these replace (SDS 3.2.8 defaults). None of these
// may appear anywhere in extension source.
const FREIGHTER_LILAC = [
  // light
  "#fdfcfe",
  "#fbfaff",
  "#f5f2ff",
  "#ede9fe",
  "#e4defc",
  "#d7cff9",
  "#c4b8f3",
  "#aa99ec",
  "#6e56cf",
  "#644fc1",
  "#5746af",
  "#20134b",
  // dark
  "#17151f",
  "#1c172b",
  "#251e40",
  "#2c2250",
  "#32275f",
  "#392c72",
  "#443592",
  "#5842c3",
  "#7c66dc",
  "#9e8cfc",
  "#f1eefe",
];

// Raw colors that are allowed to stay, per file. Everything else must be an
// SDS token.
const ALLOWED_RAW_COLORS: Record<string, string[]> = {
  // The palette override itself.
  "popup/styles/varialPalette.scss": ["*"],
  // Emulates the browser's native focus ring; deliberately not themed.
  "popup/styles/utils.scss": ["rgb(153, 200, 255)"],
  // USDT0 banner: the campaign's brand green background, the dismiss-button
  // hover drawn on that fixed green (correct in both themes), and the logo's
  // drop shadow.
  "popup/components/account/Usdt0LaunchBanner/styles.scss": [
    "#002d19",
    "#a0a0a0", // subtitle on the fixed campaign surface; must not theme-flip
    "rgba(0, 0, 0, 0.25)",
    "rgba(255, 255, 255, 0.1)",
  ],
  // USDT0 sheet hero: one composite dark artwork (gradient + arcs image +
  // fade + overlay) whose layers stay fixed-dark together. Colors on the
  // sheet body below it are tokenized.
  "popup/components/account/Usdt0LaunchBanner/Usdt0LaunchSheet/styles.scss": [
    "#002d19",
    "#161616",
    "#151616",
    "rgba(22, 23, 23, 0)",
    "rgba(21, 22, 22, 0.78)",
  ],
  // Account avatar artwork; fixed so an avatar looks the same in both themes.
  "popup/components/identicons/IdenticonImg/colors.ts": ["*"],
  // Shimmer highlight: white in both themes by design, matching mobile.
  "popup/components/Shimmer/styles.scss": [
    "rgba(255, 255, 255, 0)",
    "rgba(255, 255, 255, 0.03)",
    "rgba(255, 255, 255, 0.07)",
    "rgba(255, 255, 255, 0.08)",
    "rgba(255, 255, 255, 0.15)",
    "rgba(255, 255, 255, 0.3)",
    "rgba(255, 255, 255, 0.6)",
  ],
  // Floating tab bar: the pill's translucent fills and Figma's selection layer
  // (3514:103394), the same raw values mobile's FloatingTabBar ships. No SDS
  // token is translucent, so they can't come from the palette.
  "popup/components/TabBar/styles.scss": [
    "rgba(255, 255, 255, 0.86)",
    "rgba(33, 33, 33, 0.83)",
    "rgba(153, 153, 153, 0.15)",
  ],
  // Home's empty card: Figma's Empty (1429:165964) fills the light card with
  // this raw hex rather than a token, as mobile's EmptyState does.
  "popup/components/account/HomeEmptyState/styles.scss": ["#f5f7f9"],
  // Trending card over its artwork: fade and tag text from Figma 1123-116809,
  // fixed so they read on the image in both themes.
  "popup/views/Discover/components/TrendingCarousel/styles.scss": [
    "#232323",
    "#c7c7c7",
    "rgba(35, 35, 35, 0)",
  ],
};

// Neutral shadow/scrim alphas; black-based, so they don't invert when the
// theme flips (a white-based shadow would).
const BLACK_ALPHA = /^rgba\(0,\s*0,\s*0,\s*[\d.]+\)$/;

// The raw-color scan covers authored styles and components. SVG assets are
// static artwork: the dark-baked ones render inline (`?react`) with
// var(--sds-clr-*) fills; the rest keep literal colors that read in both
// themes (mid-gray glyphs, status colors, fixed campaign artwork). The
// banned-palette scan below still covers them, so a Freighter-colored asset
// can't land.
const STYLE_EXTENSIONS = [".scss", ".ts", ".tsx"];
const ASSET_EXTENSIONS = [...STYLE_EXTENSIONS, ".svg", ".html"];
const IGNORED_PATH_SEGMENTS = [
  "__tests__",
  "__mocks__",
  "e2e-tests",
  path.join("styles", "vendor"),
];

function walk(dir: string, extensions: string[]): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (IGNORED_PATH_SEGMENTS.some((seg) => full.includes(seg))) {
      return [];
    }
    if (entry.isDirectory()) {
      return walk(full, extensions);
    }
    return extensions.includes(path.extname(entry.name)) ? [full] : [];
  });
}

const HEX_LITERAL = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
// Literal rgb()/rgba() calls; template interpolations (`rgb(${r}...`) don't
// start with a digit and are out of scope.
const RGB_LITERAL = /rgba?\(\s*\d[\d\s,./%]*\)/g;

// Comments are stripped before scanning so issue references ("#2769",
// "freighter-mobile#936") don't trip the hex match; a color in a comment
// can't ship anyway.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .map((line) => line.replace(/\s\/\/.*$/, ""))
    .join("\n");
}

function rawColorsIn(file: string): string[] {
  const content = stripComments(fs.readFileSync(file, "utf8"));
  return [
    ...(content.match(HEX_LITERAL) || []),
    ...(content.match(RGB_LITERAL) || []),
  ];
}

function relToSrc(file: string): string {
  return path.relative(SRC_ROOT, file).split(path.sep).join("/");
}

// Dead font-token namespace pending its own typography fix: these resolve to
// nothing today (inherited weight/size ships), and correcting them app-wide is
// a design-affecting change that doesn't belong to the palette/theme work.
const KNOWN_UNRESOLVED = [
  "--font-weight-light",
  "--font-weight-regular",
  "--font-weight-medium",
  "--font-weight-semi-bold",
  "--font-weight-bold",
  "--font-size-secondary",
];

describe("custom properties resolve (freighter-private#18)", () => {
  it("every var() used in the popup is defined in app source or SDS", () => {
    // An undefined custom property doesn't error — the declaration silently
    // computes to inherited/initial, which is how the pre-SDS --color-* refs
    // shipped invisible for years and broke light mode (black check mark on
    // the navy active-wallet bubble).
    // Known limits: a definition anywhere in source counts (the scan is
    // scope-blind — fine for custom properties, which inherit — and doesn't
    // know which files a page actually loads), so it catches dangling names,
    // not wrong scoping.
    const files = walk(SRC_ROOT, STYLE_EXTENSIONS);
    const defined = new Set<string>();
    const defRe = /(--[A-Za-z0-9_-]+)\s*:/g;
    [
      ...files,
      path.join(
        SRC_ROOT,
        "../../node_modules/@stellar/design-system/build/styles.min.css",
      ),
    ].forEach((file) => {
      for (const m of stripComments(fs.readFileSync(file, "utf8")).matchAll(
        defRe,
      )) {
        defined.add(m[1]);
      }
    });

    const offenders = files.flatMap((file) => {
      const content = stripComments(fs.readFileSync(file, "utf8"));
      const out: string[] = [];
      for (const m of content.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
        const name = m[1];
        if (!defined.has(name) && !KNOWN_UNRESOLVED.includes(name)) {
          out.push(`${relToSrc(file)}: ${name}`);
        }
      }
      return out;
    });
    expect(offenders).toEqual([]);
  });
});

describe("Varial palette (freighter-private#37)", () => {
  it("overrides the SDS lilac ramp with Varial Blue for both themes", () => {
    const css = fs.readFileSync(PALETTE_FILE, "utf8");
    (["light", "dark"] as const).forEach((theme) => {
      const block = css.match(
        new RegExp(`\\.sds-theme-${theme}\\s*\\{([^}]*)\\}`),
      );
      expect(block).not.toBeNull();
      VARIAL_LILAC[theme].forEach((value, i) => {
        const token = `--sds-clr-lilac-${String(i + 1).padStart(2, "0")}`;
        expect(block![1]).toContain(`${token}: ${value}`);
      });
    });
  });

  it("has no Freighter-palette lilac left anywhere in extension source", () => {
    const offenders = [
      ...walk(SRC_ROOT, ASSET_EXTENSIONS),
      ...walk(path.join(SRC_ROOT, "..", "public"), ASSET_EXTENSIONS),
    ].flatMap((file) => {
      const content = fs.readFileSync(file, "utf8").toLowerCase();
      return FREIGHTER_LILAC.filter((hex) => content.includes(hex)).map(
        (hex) => `${relToSrc(file)}: ${hex}`,
      );
    });
    expect(offenders).toEqual([]);
  });

  it("has no raw colors outside the allowlist — colors come from SDS tokens", () => {
    const offenders = walk(SRC_ROOT, STYLE_EXTENSIONS).flatMap((file) => {
      const rel = relToSrc(file);
      const allowed = ALLOWED_RAW_COLORS[rel] || [];
      if (allowed.includes("*")) {
        return [];
      }
      return rawColorsIn(file)
        .filter((color) => !allowed.includes(color))
        .filter((color) => !BLACK_ALPHA.test(color))
        .map((color) => `${rel}: ${color}`);
    });
    expect(offenders).toEqual([]);
  });
});
