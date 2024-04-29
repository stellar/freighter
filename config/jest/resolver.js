module.exports = (path, options) =>
  options.defaultResolver(path, {
    ...options,
    // Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
    packageFilter: (pkg) => {
      if (pkg.name === "@stellar/design-system") {
        return {
          ...pkg,
          // Alter the value of `main` before resolving the package
          main: pkg.module || pkg.main,
        };
      }

      return {
        ...pkg,
      };
    },
  });
