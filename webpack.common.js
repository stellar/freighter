const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require("path");

const BUILD_PATH = path.resolve(__dirname, "./build");

const commonConfig = {
  entry: {
    background: path.resolve(__dirname, "./public/background.js"),
    contentScript: path.resolve(__dirname, "./public/contentScript.js"),
    popup: path.resolve(__dirname, "./src/Popup/index.tsx"),
    options: path.resolve(__dirname, "./src/Options/index.tsx"),
  },
  output: {
    path: BUILD_PATH,
    filename: "[name].min.js",
  },
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
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
        use: "ts-loader",
        exclude: /node-modules/,
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
      template: path.resolve(__dirname, "./public/popup.html"),
      chunks: ["popup"],
      filename: `${BUILD_PATH}/popup.html`,
    }),
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, "./public/options.html"),
      chunks: ["options"],
      filename: `${BUILD_PATH}/options.html`,
    }),
  ],
};

module.exports.commonConfig = commonConfig;
module.exports.BUILD_PATH = BUILD_PATH;
