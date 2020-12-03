const merge = require("webpack-merge");
const ModuleReplaceWebpackPlugin = require("module-replace-webpack-plugin");
const commonConfig = require("./webpack.common.js");

const devConfig = {
  plugins: [
    new ModuleReplaceWebpackPlugin({
      modules: [
        {
          test: /webextension-polyfill-ts/,
          replace: "../config/shims/webextension-polyfill.ts",
        },
      ],
    }),
  ],
};

module.exports = merge(devConfig, commonConfig);
