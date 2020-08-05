const merge = require("webpack-merge");
const webpack = require("webpack");
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
  ],
};

module.exports = merge(devConfig, commonConfig);
