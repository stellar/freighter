const { merge } = require("webpack-merge");
const webpack = require("webpack");
const I18nextWebpackPlugin = require("i18next-scanner-webpack");
const { commonConfig } = require("./webpack.common.js");
const Dotenv = require("dotenv-webpack");
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");

const smp = new SpeedMeasurePlugin();

const LOCALES = ["en", "pt"];

const prodConfig = (
  env = {
    PRODUCTION: false,
    TRANSLATIONS: false,
    AMPLITUDE_KEY: "",
    SENTRY_KEY: "",
  },
) =>
  smp.wrap({
    mode: "production",
    optimization: {
      minimize: env.PRODUCTION,
      splitChunks: {
        // ignore non-index.min.js chunk
        chunks: (chunk) => chunk.name === "index",
        // Firefox addon store has a max file size of 4mb
        maxSize: 4000000,
      },
    },

    plugins: [
      new webpack.DefinePlugin({
        DEV_SERVER: false,
        AMPLITUDE_KEY: JSON.stringify(env.AMPLITUDE_KEY),
        SENTRY_KEY: JSON.stringify(env.SENTRY_KEY),
        DEV_EXTENSION: !env.PRODUCTION,
      }),
      ...(env.TRANSLATIONS
        ? [
            new I18nextWebpackPlugin({
              async: true,
              dest: "./",
              extensions: [".ts", ".tsx"],
              options: {
                createOldCatalogs: false,
                locales: LOCALES,
                output: "src/popup/locales/$LOCALE/$NAMESPACE.json",
                sort: true,
                useKeysAsDefaultValue: true,
              },
            }),
          ]
        : []),
      new Dotenv({ systemvars: true }),
      sentryWebpackPlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_KEY,
      }),
    ],
    // This if to fine tune logged output. Since this is an extension, not a
    // webapp, we don't face the same bundle size constraints of the web.
    performance: {
      hints: false,
    },
  });

module.exports = (env) => merge(prodConfig(env), commonConfig(env));
