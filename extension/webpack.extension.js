const merge = require("webpack-merge");
const webpack = require("webpack");
const { commonConfig } = require("./webpack.common.js");

const prodConfig = (env = { PRODUCTION: false }) => ({
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
    }),
  ],
  // This if to fine tune logged output. Since this is an extension, not a
  // webapp, we don't face the same bundle size constraints of the web.
  performance: {
    hints: false,
  },
});

module.exports = (env) => merge(prodConfig(env), commonConfig(env));
