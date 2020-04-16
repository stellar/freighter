module.exports = {
  extends: ["@stellar/eslint-config"],
  globals: {
    chrome: "readonly",
  },
  ignorePatterns: ["dist/", "node_modules/"],
  overrides: [
    {
      files: ["webpack.*.js"],
      rules: {
        "import/no-extraneous-dependencies": [0, { devDependencies: false }],
      },
    },
  ],
  rules: {
    "react/jsx-filename-extension": [1, { extensions: [".tsx", ".jsx"] }],
  },
  settings: {
    "import/resolver": {
      typescript: {},
    },
  },
};
