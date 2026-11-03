// isDev must follow the build-time DEV_EXTENSION flag. Webpack defines it as a
// boolean (`!env.PRODUCTION` in webpack.extension.js, `true` under the dev
// server), and release builds set no `process.env.PRODUCTION`. The flag is
// read when @shared/constants/services loads, so each case loads a fresh copy
// with the flag mocked.
const loadIsDev = (devExtension: boolean) => {
  let isDev: boolean | undefined;
  jest.isolateModules(() => {
    jest.doMock("@shared/constants/services", () => ({
      ...jest.requireActual("@shared/constants/services"),
      DEV_EXTENSION: devExtension,
    }));
    ({ isDev } = require("@shared/helpers/dev"));
  });
  return isDev;
};

describe("isDev", () => {
  it("is false in production builds, where DEV_EXTENSION is false", () => {
    expect(loadIsDev(false)).toBe(false);
  });

  it("is true in development builds, where DEV_EXTENSION is true", () => {
    expect(loadIsDev(true)).toBe(true);
  });
});
