const esModules = ["@stellar/design-system", "stellar-hd-wallet"];

const jsdomTests = {
  rootDir: __dirname,
  roots: ["./", "./extension", "./@shared/api", "./@stellar/freighter-api"],
  collectCoverageFrom: ["src/**/*.{ts,tsx,mjs}"],
  setupFiles: [
    "<rootDir>/config/jest/setupTests.tsx",
    "<rootDir>/node_modules/jest-canvas-mock",
  ],
  setupFilesAfterEnv: [
    "<rootDir>/config/jest/extendJest.ts",
    "@testing-library/jest-dom",
  ],
  testEnvironmentOptions: {
    url: "http://localhost",
  },
  transform: {
    "^.+\\.(js|jsx|ts|tsx|mjs)$": ["babel-jest"],
  },
  transformIgnorePatterns: [`/node_modules/(?!${esModules.join("|")})`],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/config/jest/__mocks__/fileMock.ts",
    "^.+\\.svg\\?(react)(.+)?$": "<rootDir>/config/jest/__mocks__/fileMock.ts",
    "\\.(scss|css)$": "<rootDir>/config/jest/__mocks__/styleMock.ts",
  },
  moduleFileExtensions: ["js", "jsx", "json", "node", "mjs", "ts", "tsx"],
  moduleDirectories: ["node_modules", "<rootDir>/extension/src", "<rootDir>/."],
  testEnvironment: "jest-fixed-jsdom",
  resolver: "<rootDir>/config/jest/resolver.js",
  modulePathIgnorePatterns: ["extension/e2e-tests"],
};

module.exports = {
  projects: [
    {
      displayName: "jsdom",
      ...jsdomTests,
    },
    {
      displayName: "node",
      testMatch: ["<rootDir>/testNodeCompat.js"],
    },
  ],
};
