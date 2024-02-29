const CopyWebpackPlugin = require("copy-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

const { DEFAULT_STATS } = require("../config/webpack");

const BUILD_PATH = path.resolve(__dirname, "./build");

const commonConfig = (
  env = { EXPERIMENTAL: false, AMPLITUDE_KEY: "", SENTRY_KEY: "" },
) => ({
  entry: {
    background: path.resolve(__dirname, "./public/background.ts"),
    index: ["babel-polyfill", path.resolve(__dirname, "./src/popup/index.tsx")],
    contentScript: [
      "babel-polyfill",
      path.resolve(__dirname, "./public/contentScript.ts"),
    ],
  },
  watchOptions: {
    ignored: ["node_modules/**/*", "build/**/*"],
  },
  output: {
    path: BUILD_PATH,
    filename: (pathData) => {
      const name = pathData.chunk.name;
      /* don't add a hash to background and contentScript files 
      because manifest.json is hardcoded to look for background.min.js 
      and contentScript.min.js */

      return name && !name.includes("index")
        ? `${name.split("~")[0]}.min.js`
        : "[name].min.js";
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.resolve(__dirname, "./tsconfig.json"),
      }),
    ],
    fallback: {
      fs: false,
      stream: require.resolve("stream-browserify"),
      util: require.resolve("util/"),
      url: require.resolve("url/"),
      https: require.resolve("https-browserify"),
      http: require.resolve("stream-http"),
      os: require.resolve("os-browserify/browser"),
      path: require.resolve("path-browserify"),
      buffer: require.resolve("buffer"),
      "process/browser": require.resolve("process/browser"),
    },
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
        use: ["ts-loader"],
        exclude: /node-modules/,
      },
      {
        test: /\.(js)$/,
        use: ["babel-loader"],
        include: /webextension-polyfill/,
      },
      {
        test: /\.png$/,
        type: "asset/resource",
      },
      {
        test: /\.svg$/,
        type: "asset/resource",
      },
      {
        test: /\.(css|sass|scss)$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
            },
          },
          { loader: "sass-loader" },
        ],
      },
      {
        test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
        type: "asset/resource",
        generator: {
          filename: "fonts/[hash][ext]",
        },
      },
    ],
  },
  plugins: [
    new ESLintPlugin({
      extensions: [".ts", ".tsx"],
      failOnWarning: true,
    }),
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, "./public/static"),
        to: BUILD_PATH,
      },
      {
        from: path.resolve(__dirname, "./public/static/manifest/v2.json"),
        to: `${BUILD_PATH}/manifest.json`,
      },
    ]),
    new HtmlWebPackPlugin({
      template: path.resolve(__dirname, "./public/index.html"),
      chunks: ["index"],
      filename: `${BUILD_PATH}/index.html`,
    }),
    new webpack.DefinePlugin({
      EXPERIMENTAL: env.EXPERIMENTAL,
      AMPLITUDE_KEY: JSON.stringify(env.AMPLITUDE_KEY),
      SENTRY_KEY: JSON.stringify(env.SENTRY_KEY),
    }),
    new MiniCssExtractPlugin({
      filename: "[name].min.css",
      chunkFilename: "[name].min.css",
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
  stats: DEFAULT_STATS,
});

module.exports.commonConfig = commonConfig;
module.exports.BUILD_PATH = BUILD_PATH;
