const createExpoWebpackConfigAsync = require("@expo/webpack-config");

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  config.entry = {
    main: "./App.js",
    background: "./platform/extension/background",
    contentScript: "./platform/extension/content-script",
  };
  config.mode = "development";

  config.output.filename = "[name].bundle.js";

  return config;
};
