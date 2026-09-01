import en from "popup/locales/en/translation.json";
import pt from "popup/locales/pt/translation.json";

const swapKeys = [
  "Quote has expired, please try again to get a new quote",
  "Token discovery is temporarily unavailable. You can still swap between tokens you already hold.",
  "Soroban contract tokens aren't supported for swaps yet. Try searching for a Classic token instead.",
  "No tokens match {{term}}",
  "Select a token",
  "You sell",
  "You receive",
  "Insufficient balance",
  "Insufficient balance. Maximum spendable: {{amount}} {{symbol}}",
  "Not enough XLM for network fees",
  "No quote available",
  "The token you're receiving was flagged as malicious by Blockaid.",
  "The token you're receiving was flagged as suspicious by Blockaid.",
  "The token you're receiving couldn't be scanned for security risks.",
  "The token you're sending was flagged as malicious by Blockaid.",
  "The token you're sending was flagged as suspicious by Blockaid.",
  "The token you're sending couldn't be scanned for security risks.",
  "You need XLM to create a trustline",
  "To receive {{tokenCode}}, your wallet needs a trustline on Stellar.",
  "Why do I need XLM?",
  "0.5 XLM required",
  "Stellar requires this reserve to add {{tokenCode}}. You can get it back once your {{tokenCode}} balance is zero.",
  "Swap for 0.5 XLM",
  "Copy my wallet address",
];

const earnKeys = [
  "Choose an asset",
  "In your wallet",
  "Other supported assets",
  "Supported tokens",
  "No supported assets in your wallet",
  "Add a supported asset to start earning.",
  "APY may change based on protocol conditions.",
  "{{rate}}% APY",
  "Earn with Blend",
  "Supply assets to Blend and earn variable yield.",
  "Earn variable yield",
  "Supply supported assets and earn based on current APY.",
  "Stay in control",
  "Manage and withdraw your supplied assets from your wallet.",
  "Not enough {{code}}",
  "Swap for {{code}}",
  "Buy {{code}}",
  "Deposit",
  "You deposit",
  "{{amount}} {{code}} available",
  "Current APY: {{rate}}*",
  "by Blend",
  "Review deposit",
  "Insufficient funds",
  "You need some XLM for the network fee",
  "Not enough XLM left for the network fee. Reduce your deposit by at least {{amount}} XLM.",
  "Not enough XLM to cover the network fee. Try depositing a smaller amount.",
  "Add XLM to your wallet to continue",
  "Transaction failed. Try again.",
  "Pool Performance",
  "Deposit supported assets into this Blend pool to earn yield. APY may change over time. Withdraw anytime.",
  "View pool details",
  "Interest",
  "Net APY",
  "Supplied",
  "Borrowed",
  "Backstop",
  "You are depositing",
  "Position",
  "Current APY",
  "Monthly earnings (est.)",
  "Yearly earnings (est.)",
  "Depositing",
  "Deposited!",
  "{{amount}} {{code}} to {{pool}}",
  "{{from}} has been swapped to {{to}}",
];

describe("earn i18n parity", () => {
  it("defines every earn key in en and pt", () => {
    earnKeys.forEach((k) => {
      expect(en).toHaveProperty([k]);
      expect(pt).toHaveProperty([k]);
    });
  });
});

// An empty value is never correct. i18next returns "" for a key whose value is
// empty, so the UI renders BLANK — whereas a missing key falls back to the key
// itself and at least reads. The i18next scanner adds newly-seen keys with empty
// values on every build, so without this check a feature ships with unlabelled
// buttons and nothing fails.
const findEmptyValues = (bundle: Record<string, string>) =>
  Object.entries(bundle)
    .filter(([, value]) => value === "")
    .map(([key]) => key);

describe("i18n empty values", () => {
  it.each([
    ["en", en],
    ["pt", pt],
  ])("has no empty translation values in %s", (_name, bundle) => {
    expect(findEmptyValues(bundle as Record<string, string>)).toEqual([]);
  });

  it("detects an empty value", () => {
    // Guards the guard, as above: a check that never fires would let the
    // scanner's blank entries through unnoticed.
    expect(findEmptyValues({ Filled: "Preenchido", Blank: "" })).toEqual([
      "Blank",
    ]);
  });
});

describe("swap i18n parity", () => {
  it("defines every swap key in en and pt", () => {
    swapKeys.forEach((k) => {
      expect(en).toHaveProperty([k]);
      expect(pt).toHaveProperty([k]);
    });
  });
});

// i18next only interpolates {{double}} braces. A single-brace placeholder type
// checks, passes review, and ships a literal "{walletType}" to the user — which
// is exactly how the hardware-wallet headers read until this was fixed.
const SINGLE_BRACE_PLACEHOLDER = /(?<!\{)\{(?!\{)[^{}]+\}(?!\})/;

// Pre-existing and unrelated to hardware wallets: SSLWarningMessage
// (WarningMessages/index.tsx) passes `values={{ url }}` against a `{url}` key,
// so the domain never renders. Left alone here to keep this PR to one concern —
// allowlisted so the check still blocks *new* instances.
const KNOWN_SINGLE_BRACE = [
  "The website <1>{url}</1> does not use an SSL certificate.",
  "O site <1>{url}</1> não usa um certificado SSL.",
];

const findSingleBracePlaceholders = (bundle: Record<string, string>) =>
  Object.entries(bundle)
    .flatMap(([key, value]) => [key, value])
    .filter((str) => SINGLE_BRACE_PLACEHOLDER.test(str))
    .filter((str) => !KNOWN_SINGLE_BRACE.includes(str));

describe("i18n placeholder syntax", () => {
  it.each([
    ["en", en],
    ["pt", pt],
  ])("uses {{double}} braces for every placeholder in %s", (_name, bundle) => {
    expect(
      findSingleBracePlaceholders(bundle as Record<string, string>),
    ).toEqual([]);
  });

  it("detects a single-brace placeholder", () => {
    // Guards the guard: a regex that matches nothing would pass the checks
    // above no matter what shipped.
    expect(
      findSingleBracePlaceholders({
        "Connect {walletType}": "Conectar {walletType}",
      }),
    ).toEqual(["Connect {walletType}", "Conectar {walletType}"]);
  });
});
