module.exports = {
  extends: ["@stellar/eslint-config"],
  env: {
    es2020: true,
  },
  globals: {
    chrome: "readonly",
    DEV_SERVER: "readonly",
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "build/",
    "__mocks__/",
    "e2e-tests/",
  ],
  overrides: [
    {
      files: ["webpack.*.js"],
      rules: {
        "import/no-extraneous-dependencies": [0, { devDependencies: false }],
      },
    },
  ],
  rules: {
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": ["error"],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error"],
    "no-console": "off",
    "react/jsx-filename-extension": ["error", { extensions: [".tsx", ".jsx"] }],
    "jsdoc/newline-after-description": "off",
    "max-len": "off",
    "no-await-in-loop": "off",
    "import/no-unresolved": [
      "error",
      {
        // Ignore Webpack query parameters, not supported by eslint-plugin-import
        // https://github.com/import-js/eslint-plugin-import/issues/2562
        ignore: ["\\?react$"],
      },
    ],
  },
  settings: {
    "import/resolver": {
      typescript: {},
      node: {
        extensions: [".ts", ".tsx"],
        moduleDirectory: ["node_modules", "src"],
      },
    },
  },
};
