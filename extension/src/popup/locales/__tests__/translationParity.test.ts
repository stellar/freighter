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
  "Not enough XLM for network fees",
  "No quote available",
  "The token you're receiving was flagged as malicious by Blockaid.",
  "The token you're receiving was flagged as suspicious by Blockaid.",
  "The token you're receiving couldn't be scanned for security risks.",
  "The token you're sending was flagged as malicious by Blockaid.",
  "The token you're sending was flagged as suspicious by Blockaid.",
  "The token you're sending couldn't be scanned for security risks.",
];

describe("swap i18n parity", () => {
  it("defines every swap key in en and pt", () => {
    swapKeys.forEach((k) => {
      expect(en).toHaveProperty([k]);
      expect(pt).toHaveProperty([k]);
    });
  });
});
