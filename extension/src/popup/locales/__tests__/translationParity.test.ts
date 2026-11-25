import en from "popup/locales/en/translation.json";
import pt from "popup/locales/pt/translation.json";

const swapKeys = [
  "Quote has expired, please try again to get a new quote",
  "Token discovery is temporarily unavailable. You can still swap between tokens you already hold.",
  "No tokens match {{term}}",
  "Select a token",
  "You sell",
  "You receive",
  "Insufficient balance",
  "Insufficient balance. Maximum spendable: {{amount}} {{symbol}}",
  "Not enough XLM for network fees",
  "No quote available",
  "Swaps are temporarily unavailable",
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
  "Swap in progress",
  "Swap complete",
  "was swapped for",
];

const earnKeys = [
  "Choose a token",
  "Select a token to deposit and earn yield.",
  "Deposit into",
  "In your wallet",
  "Supported tokens",
  "No supported assets in your wallet",
  "Add a supported asset to start earning.",
  "*APY is variable and subject to change.",
  "{{rate}}% APY*",
  "Put your tokens to work",
  "Supply tokens to Blend and earn variable yield.",
  "Earn variable yield",
  "Supply supported tokens and earn based on current APY.",
  "Stay in control",
  "Manage and withdraw your supplied tokens from your wallet.",
  "Not enough {{code}}",
  "Get {{code}} to deposit into this pool.",
  "Swap, buy or transfer {{code}} to continue.",
  "Swap or transfer {{code}} to continue.",
  "Buy or transfer {{code}} to continue.",
  "Transfer {{code}} to continue.",
  "Swap for {{code}}",
  "Buy {{code}}",
  "Receive {{code}}",
  "Receive funds",
  "This address supports Stellar network.",
  "Deposit",
  "You deposit",
  "{{amount}} {{code}} available",
  "Current APY: {{rate}}",
  "{{name}} Pool",
  "by Blend",
  "Review deposit",
  "You need XLM to pay fees",
  "You don’t have enough available XLM to cover the transaction fee. Add XLM to continue with your deposit.",
  "Not enough XLM left for the network fee. Reduce your deposit by at least {{amount}} XLM.",
  "Not enough XLM to cover the network fee. Try depositing a smaller amount.",
  "Not enough {{code}} for this deposit. Try a smaller amount.",
  "The pool can’t take this deposit right now. Try again later.",
  "Transaction failed. Try again.",
  "Description",
  "Deposit supported tokens into this Blend pool to earn yield. APY may change over time. Withdraw anytime.",
  "View pool details",
  "Current yield",
  "Deposit APY",
  "Pool liquidity",
  "Supplied",
  "Borrowed",
  "Backstop",
  "You are depositing",
  "Position",
  "Current APY",
  "Monthly earnings (est.)",
  "Yearly earnings (est.)",
  "Deposit in progress",
  "Deposit complete",
  "Deposited {{code}}",
  "Deposited",
  "{{from}} swapped to {{amount}} {{to}}",
  "My position",
  "About pool",
  "Your position",
  "Supplied asset",
  "Current Balance",
  "Your deposits",
  "Your earnings",
  "Blend",
  "Blend pool",
  "Earn APY",
  "{{rate}} APY",
  "To",
  "or",
  "No positions yet",
  "Failed to fetch your positions.",
  "Your positions could not be fetched at this time.",
  "We couldn’t load earnable tokens. Please try again.",
  "We couldn’t load your balances. Please try again.",
  "Start Earning",
  "You could earn up to",
  "Est. monthly earnings",
  "Est. yearly earnings",
  "/year on your tokens",
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

  // "Taxa" would read as a second fee next to the network fee row.
  it("labels the Details sheet's rate as a quote rate, not a fee", () => {
    expect(en).toHaveProperty(["Swap details rate"], "Rate");
    expect(pt).toHaveProperty(["Swap details rate"], "Cotação");
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

const lockScreenKeys = [
  "Freighter is now Varial",
  "Forgot password",
  "Forgot your password?",
  "Your password is stored only on this device and can’t be recovered.",
  "You can reset Varial with your recovery phrase, set a new password, and re-import.",
  "Make sure you have your recovery phrase before continuing.",
  "Reset wallet",
  "Couldn’t reset your wallet. Try again.",
];

describe("lock screen i18n parity", () => {
  it("defines every lock-screen key in en and translates it in pt", () => {
    lockScreenKeys.forEach((k) => {
      expect(en).toHaveProperty([k], k);
      expect(pt).toHaveProperty([k]);
      expect((pt as Record<string, string>)[k]).not.toEqual(k);
    });
  });
});

const welcomeKeys = [
  "Welcome to Varial",
  "Your favorite Stellar wallet",
  "Create new wallet",
  "Import wallet",
];

describe("Welcome i18n parity", () => {
  it("defines every Welcome key in en and translates it in pt", () => {
    welcomeKeys.forEach((k) => {
      expect(en).toHaveProperty([k], k);
      expect(pt).toHaveProperty([k]);
      expect((pt as Record<string, string>)[k]).not.toEqual(k);
    });
  });
});

describe("pt spelling", () => {
  it("writes “Bem vindo” without a hyphen", () => {
    expect(
      Object.values(pt).filter((value) => /bem-vind/i.test(value)),
    ).toEqual([]);
  });
});
