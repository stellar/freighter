const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require("path");

const BUILD_PATH = path.resolve(__dirname, "./build");

const commonConfig = {
  node: { global: true, fs: "empty" },
  entry: {
    background: [
      "babel-polyfill",
      path.resolve(__dirname, "./public/background.ts"),
    ],
    index: ["babel-polyfill", path.resolve(__dirname, "./src/popup/index.tsx")],
    lyraApi: path.resolve(__dirname, "./src/contentScript/lyraApi/index.ts"),
    contentScript: path.resolve(__dirname, "./public/contentScript.ts"),
  },
  output: {
    path: BUILD_PATH,
    filename: "[name].min.js",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, "./tsconfig.json"),
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader",
          },
        ],
      },
      {
        test: /\.(ts|tsx)$/,
        use: ["ts-loader", "eslint-loader"],
        exclude: /node-modules/,
      },
      {
        test: /\.png$/,
        use: [
          {
            loader: "file-loader",
          },
        ],
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: "svg-url-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: path.resolve(__dirname, "./public/static"), to: BUILD_PATH },
    ]),
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, "./public/index.html"),
      chunks: ["index"],
      filename: `${BUILD_PATH}/index.html`,
    }),
  ],
};

module.exports.commonConfig = commonConfig;
module.exports.BUILD_PATH = BUILD_PATH;
