const merge = require("webpack-merge");
const { BUILD_PATH, commonConfig } = require("./webpack.common.js");

const devConfig = {
  mode: "development",
  devServer: {
    contentBase: BUILD_PATH,
    port: 9000,
  },
};

module.exports = merge(devConfig, commonConfig);
