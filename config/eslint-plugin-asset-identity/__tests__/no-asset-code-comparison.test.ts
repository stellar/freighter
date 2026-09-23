import { RuleTester } from "eslint";

import assetIdentity from "../index.mjs";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

// Prettier rewrites a double-quoted string containing double quotes to single
// quotes, which the repo's quote rule then rejects. Quoting the sample sources
// internally with single quotes keeps both tools satisfied; the rule reads the
// parsed literal either way.
//
// RuleTester.run() drives Jest's global describe/it itself (one describe per
// "valid"/"invalid" group, one it per case), so the call must sit at the
// top level here rather than inside an it() — Jest's runner rejects a
// describe/it pair started from inside an already-running test.
ruleTester.run(
  "no-asset-code-comparison",
  assetIdentity.rules["no-asset-code-comparison"],
  {
    valid: [
      "if (isNativeAssetId(canonical)) { go(); }",
      "if (isNativeAssetPair(code, issuer)) { go(); }",
      "const label = code + ':' + issuer;",
      // Only strict equality is reported; other operators are untouched.
      "if (code > 'XLM') { go(); }",
      "if (code === 'USDC') { go(); }",
      // Comparing a contract id against the derived native contract is the
      // sound check in contract space and must stay reportable-free.
      "if (Asset.native().contractId(passphrase) === contractId) { go(); }",
      "if (contractId !== getNativeContractId(passphrase)) { go(); }",
    ],
    invalid: [
      {
        code: "if (token.code === 'XLM') { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      {
        code: "if (balance.token.type !== 'native') { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      // The sentinel on the left-hand side is the same defect.
      {
        code: "if ('XLM' === someCode) { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      // Optional chaining must not hide the comparison.
      {
        code: "if (token?.code === 'XLM') { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      // Any operand name is reported, so renaming a variable is no escape.
      {
        code: "if (srcTokenCodeFinal === 'XLM') { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      {
        code: "if (NATIVE_TOKEN_CODE === someCode) { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      // The SDK's own native code is the bare code in a different spelling.
      {
        code: "if (sourceAsset.code === Asset.native().code) { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      {
        code: "if (StellarSdk.Asset.native().code === code) { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
      {
        code: "if (code !== Asset.native().getCode()) { go(); }",
        errors: [{ messageId: "noAssetCodeComparison" }],
      },
    ],
  },
);
