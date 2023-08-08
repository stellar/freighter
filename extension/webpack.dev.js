const { merge } = require("webpack-merge");
const webpack = require("webpack");
const path = require("path");

const { BUILD_PATH, commonConfig } = require("./webpack.common.js");

const devConfig = {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    static: BUILD_PATH,
    port: 9000,
  },
  plugins: [
    new webpack.DefinePlugin({
      DEV_SERVER: true,
    }),
    new webpack.NormalModuleReplacementPlugin(
      /webextension-polyfill/,
      path.resolve(__dirname, "../config/shims/webextension-polyfill.ts"),
    ),
  ],
};

module.exports = (env) => merge(devConfig, commonConfig(env));
