const { merge } = require("webpack-merge");
const webpack = require("webpack");
const path = require("path");
const Dotenv = require("dotenv-webpack");
const dotenv = require("dotenv");

const { BUILD_PATH, commonConfig } = require("./webpack.common.js");

// Load .env file and validate required variables
dotenv.config();

const REQUIRED_ENV_VARS = ["INDEXER_URL", "INDEXER_V2_URL"];
const missingVars = REQUIRED_ENV_VARS.filter(
  (varName) => !process.env[varName],
);

if (missingVars.length > 0) {
  console.error(
    "\n\x1b[31m%s\x1b[0m",
    "ERROR: Missing required environment variables:",
  );
  missingVars.forEach((varName) => {
    console.error(`  - ${varName}`);
  });
  console.error(
    "\nPlease create an extension/.env file with the following variables:",
  );
  console.error("  INDEXER_URL=<backend-url>");
  console.error("  INDEXER_V2_URL=<backend-v2-url>");
  console.error("\nSee extension/README.md for configuration details.\n");
  process.exit(1);
}

const devConfig = {
  mode: "development",
  devtool: "cheap-source-map",
  devServer: {
    static: BUILD_PATH,
    port: 9000,
  },
  plugins: [
    new webpack.DefinePlugin({
      DEV_SERVER: true,
      DEV_EXTENSION: true,
    }),
    new webpack.NormalModuleReplacementPlugin(
      /webextension-polyfill/,
      path.resolve(__dirname, "../config/shims/webextension-polyfill.ts"),
    ),
    new Dotenv(),
  ],
};

module.exports = (env) => merge(devConfig, commonConfig(env));
