const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require("path");

const BUILD_PATH = path.resolve(__dirname, "./build");

const config = {
  mode: "production",
  node: { global: true, fs: "empty" },
  entry: {
    index: path.resolve(__dirname, "./src/index.ts"),
  },
  output: {
    path: BUILD_PATH,
    filename: "[name].min.js",
  },
  resolve: {
    extensions: [".ts"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, "./tsconfig.json"),
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: ["babel-loader", "ts-loader"],
      },
    ],
  },
  resolveLoader: {
    modules: [path.resolve(__dirname, "../../node_modules")],
  },
};

module.exports = config;
