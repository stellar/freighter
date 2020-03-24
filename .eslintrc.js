module.exports = {
  extends: ["@stellar/eslint-config"],
  globals: {
    chrome: "readonly",
  },
  ignorePatterns: ["dist/", "node_modules/"],
  rules: {
    "import/no-unresolved": 0,
    "import/no-extraneous-dependencies": [0, { devDependencies: false }],
    "react/jsx-filename-extension": [1, { extensions: [".tsx", ".jsx"] }],
  },
};
