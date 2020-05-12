const merge = require("webpack-merge");
const webpack = require("webpack");
const { commonConfig } = require("./webpack.common.js");

const prodConfig = {
  optimization: {
    minimize: false,
  },
  mode: "production",
  plugins: [
    new webpack.DefinePlugin({
      DEVELOPMENT: false,
    }),
  ],
};

module.exports = merge(prodConfig, commonConfig);
