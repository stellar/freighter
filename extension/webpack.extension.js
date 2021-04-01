const merge = require("webpack-merge");
const webpack = require("webpack");
const { commonConfig } = require("./webpack.common.js");

const prodConfig = {
  mode: "production",
  plugins: [
    new webpack.DefinePlugin({
      DEV_SERVER: false,
    }),
  ],
  // This if to fine tune logged output. Since this is an extension, not a
  // webapp, we don't really care how large the bundle is.
  performance: {
    hints: false,
  },
};

module.exports = (env) => merge(prodConfig, commonConfig(env));
