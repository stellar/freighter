const merge = require("webpack-merge");
const webpack = require("webpack");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const path = require("path");
const { BUILD_PATH, commonConfig } = require("./webpack.common.js");

const devConfig = {
  mode: "development",
  devtool: "inline-source-map",
  devServer: {
    contentBase: BUILD_PATH,
    disableHostCheck: true,
    port: 9000,
  },
  entry: {
    playground: [
      "babel-polyfill",
      path.resolve(__dirname, "./public/playground/js/index.js"),
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      DEVELOPMENT: true,
    }),
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, "./public/playground/index.html"),
      chunks: ["playground"],
      filename: `${BUILD_PATH}/playground.html`,
    }),
  ],
};

module.exports = merge(devConfig, commonConfig);
