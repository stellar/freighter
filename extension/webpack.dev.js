const { merge } = require("webpack-merge");
const webpack = require("webpack");
const path = require("path");
const Dotenv = require("dotenv-webpack");

const { BUILD_PATH, commonConfig } = require("./webpack.common.js");

const smp = new SpeedMeasurePlugin();

const devConfig = {
  mode: "development",
  devtool: "cheap-source-map",
  devServer: {
    static: BUILD_PATH,
    port: 9000,
  },
  plugins: [
    new webpack.DefinePlugin({
      DEV_SERVER: true,
      DEV_EXTENSION: true,
    }),
    new webpack.NormalModuleReplacementPlugin(
      /webextension-polyfill/,
      path.resolve(__dirname, "../config/shims/webextension-polyfill.ts"),
    ),
    new Dotenv(),
  ],
};

module.exports = (env) => merge(devConfig, commonConfig(env));
