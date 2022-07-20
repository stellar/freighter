const esModules = ["@stellar/wallet-sdk"];

module.exports = {
  rootDir: __dirname,
  roots: ["./", "./extension", "./@shared/api", "./@stellar/freighter-api"],
  collectCoverageFrom: ["src/**/*.{js,jsx,mjs}"],
  setupFiles: ["<rootDir>/config/jest/setupTests.ts"],
  setupFilesAfterEnv: ["<rootDir>/config/jest/extendJest.ts"],
  testURL: "http://localhost",
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest"],
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules})`],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/config/jest/__mocks__/fileMock.ts",
    "\\.(css|less)$": "<rootDir>/config/jest/__mocks__/styleMock.ts",
  },
  moduleFileExtensions: ["js", "jsx", "json", "node", "mjs", "ts", "tsx"],
  moduleDirectories: ["node_modules", "<rootDir>/extension/src", "<rootDir>/."],
};
