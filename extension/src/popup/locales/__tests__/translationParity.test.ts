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
