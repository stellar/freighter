const webpack = require("webpack");
const { merge } = require("webpack-merge");
const commonConfig = require("./webpack.common.js");

const devConfig = {
  plugins: [
    new webpack.DefinePlugin({
      DEV_SERVER: true,
      DEV_EXTENSION: true,
    }),
  ],
};

module.exports = merge(devConfig, commonConfig);
