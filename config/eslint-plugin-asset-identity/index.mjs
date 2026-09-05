// Values that name the native asset by themselves: the display code, the
// identifier the codebase uses for it, and the constants that hold them.
//
// An asset's identity is the pair (code, issuer) — or, for a contract token,
// its contract id — so comparing anything directly against one of these is
// unsound regardless of what the other operand is. It has to go through a
// predicate instead.
const NATIVE_LITERAL_VALUES = ["XLM", "native"];
const NATIVE_IDENTIFIER_NAMES = [
  "NATIVE_TOKEN_CODE",
  "HORIZON_NATIVE_ASSET_TYPE",
];

// Unwraps an optional-chaining member access (`a?.b`) to the member expression
// it wraps, so `token?.code` is inspected the same way as `token.code`.
const unwrapChain = (node) =>
  node.type === "ChainExpression" ? node.expression : node;

const isNativeSentinel = (rawNode) => {
  const node = unwrapChain(rawNode);

  if (
    node.type === "Literal" &&
    typeof node.value === "string" &&
    NATIVE_LITERAL_VALUES.includes(node.value)
  ) {
    return true;
  }

  return (
    node.type === "Identifier" && NATIVE_IDENTIFIER_NAMES.includes(node.name)
  );
};

const noAssetCodeComparison = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow comparing anything directly to a native-asset sentinel",
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      noAssetCodeComparison:
        "Identify the native asset with a predicate from @shared/helpers/assetIdentity instead of comparing it to a native-asset sentinel.",
    },
  },

  create(context) {
    return {
      BinaryExpression(node) {
        if (node.operator !== "===" && node.operator !== "!==") {
          return;
        }

        if (isNativeSentinel(node.left) || isNativeSentinel(node.right)) {
          context.report({ node, messageId: "noAssetCodeComparison" });
        }
      },
    };
  },
};

export default {
  rules: {
    "no-asset-code-comparison": noAssetCodeComparison,
  },
};
