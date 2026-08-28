// Packages shipped as ESM that Jest must transform (babel) rather than skip.
// stellar-sdk v17 is ESM-first and its CJS build `require()`s ESM-only deps
// (@noble/*, js-xdr, @exodus/bytes, uint8array-extras) — Node 22.12+ supports
// that natively, but Jest's CJS module registry does not, so babel has to
// transform them here.
const esModules = [
  "@stellar/design-system",
  "stellar-hd-wallet",
  "stellar-sdk",
  "@stellar/stellar-base",
  "@stellar/js-xdr",
  "@noble/hashes",
  "@noble/curves",
  "@noble/ed25519",
  "@exodus/bytes",
  "eventsource",
  "uint8array-extras",
  "smol-toml",
  "feaxios",
];

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
  // Fixtures live under __tests__/fixtures/ as importable data, not test files;
  // without this the default __tests__ glob treats them as empty suites.
  testPathIgnorePatterns: ["/node_modules/", "/__tests__/fixtures/"],
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
