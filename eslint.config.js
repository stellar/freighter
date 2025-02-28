import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    ignores: [
      "node_modules/",
      "/test-results/",
      "/playwright-report/",
      "/build/",
      "/config/",
      "**/.github/**/*",
      "**/webpack.extension.js",
      "**/webpack.production.js",
      "**/webpack.common.js",
      "**/webpack.dev.js",
      "**/__tests__/**/*",
      "**/build/**/*",
      "**/e2e-tests/**/*",
      "**/.docusaurus/**/*",
      "**/jest.config.js",
      "**/babel.config.js",
      "**/testNodeCompat.js",
      "**/prettier.config.js",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        RequestInit: "readonly",
        chrome: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin,
      eslintPluginPrettierRecommended,
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": { typescript: true },
    },
    rules: {
      // TypeScript Rules
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      "no-prototype-builtins": "off",
      "no-unused-disable": "off",
      "jsx-a11y/no-autofocus": "off",

      // React Rules
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",

      // Hooks Rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import Rules
      "import/no-unresolved": "warn",

      semi: ["error", "always"],
      "no-unsafe-optional-chaining": "off",
    },
  },
];
