module.exports = {
  extends: ["../../.eslintrc.js"],
  overrides: [
    {
      rules: {
        files: ["*.ts"],
        "import/no-unresolved": [0, { ignore: "@lyraAlias.*$" }],
      },
    },
  ],
};
