const merge = require("webpack-merge");
const webpack = require("webpack");
const ModuleReplaceWebpackPlugin = require("module-replace-webpack-plugin");
const { BUILD_PATH, commonConfig } = require("./webpack.common.js");

const devConfig = {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    contentBase: BUILD_PATH,
    disableHostCheck: true,
    port: 9000,
  },
  plugins: [
    new webpack.DefinePlugin({
      DEVELOPMENT: true,
    }),
    new ModuleReplaceWebpackPlugin({
      modules: [
        {
          test: /webextension-polyfill-ts/,
          replace: "./src/shims/webextension-polyfill.ts",
        },
      ],
    }),
  ],
};

module.exports = (env) => merge(devConfig, commonConfig(env));
