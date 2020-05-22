module.exports = {
  extends: ["@stellar/eslint-config"],
  globals: {
    chrome: "readonly",
    DEVELOPMENT: "readonly",
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
    "no-console": 0,
    "react/jsx-filename-extension": [1, { extensions: [".tsx", ".jsx"] }],
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
