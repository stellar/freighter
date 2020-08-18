const DEFAULT_STATS = {
  // minimal
  // can use `preset: "minimal"` once webpack 5 lands
  all: false,
  modules: true,
  maxModules: 0,
  errors: true,
  warnings: true,
  // our additional options
  moduleTrace: true,
  errorDetails: true,
  assets: true,
  excludeAssets: [/\.d\.ts/, /\.png/, /\.jpe?g/],
  hash: true,
  timings: true,
};

module.exports = {
  DEFAULT_STATS,
};
