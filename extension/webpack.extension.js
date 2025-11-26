const { merge } = require("webpack-merge");
const webpack = require("webpack");
const I18nextWebpackPlugin = require("i18next-scanner-webpack");
const { commonConfig } = require("./webpack.common.js");
const Dotenv = require("dotenv-webpack");
const { sentryWebpackPlugin } = require("@sentry/webpack-plugin");
const SpeedMeasurePlugin = require("speed-measure-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const fs = require("fs");
const path = require("path");

const smp = new SpeedMeasurePlugin();

const LOCALES = ["en", "pt"];

// Cache for existing translations to avoid reading files multiple times
const existingTranslationsCache = new Map();

// Custom transform function that preserves existing translations
// Only adds new keys, never overwrites existing values
function preserveExistingTranslations(locale, namespace, key, value) {
  const cacheKey = `${locale}:${namespace}`;

  // Load existing translations into cache if not already loaded
  if (!existingTranslationsCache.has(cacheKey)) {
    const translationPath = path.join(
      __dirname,
      "src/popup/locales",
      locale,
      `${namespace}.json`,
    );

    let existingTranslations = {};
    if (fs.existsSync(translationPath)) {
      try {
        const existingContent = fs.readFileSync(translationPath, "utf-8");
        existingTranslations = JSON.parse(existingContent);
      } catch (e) {
        // If file is corrupted, start fresh
        console.warn(
          `Warning: Could not parse ${translationPath}, starting fresh`,
        );
      }
    }
    existingTranslationsCache.set(cacheKey, existingTranslations);
  }

  const existingTranslations = existingTranslationsCache.get(cacheKey);

  // If key already exists, preserve its value
  if (existingTranslations.hasOwnProperty(key)) {
    return existingTranslations[key];
  }

  // For new keys, use the provided value (or empty string for non-EN locales)
  if (locale === "en") {
    return value || key; // Use key as default for EN
  } else {
    return ""; // Empty string for other locales (needs manual translation)
  }
}

const prodConfig = (
  env = {
    PRODUCTION: false,
    TRANSLATIONS: false,
    AMPLITUDE_KEY: "",
    SENTRY_KEY: "",
  },
) =>
  smp.wrap({
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin()],
    },
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
                defaultNamespace: "translation",
                ns: ["translation"],
                output: "src/popup/locales/$LOCALE/$NAMESPACE.json",
                sort: true,
                useKeysAsDefaultValue: false,
                defaultValue: (locale, namespace, key, value) => {
                  return preserveExistingTranslations(
                    locale,
                    namespace,
                    key,
                    value,
                  );
                },
                keepRemoved: true,
                removeUnusedKeys: false,
                keySeparator: false,
                nsSeparator: false,
                func: {
                  list: ["t", "i18next.t", "i18n.t"],
                  extensions: [".ts", ".tsx"],
                },
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
