# Lyra API

## Installation

Before this can be imported in another project in this monorepo, run
`yarn build` in this directory to create the built package.

## `@lyraAlias` import

Because this package needs to be packaged and published, it cannot have any
dependencides that are not on the npm registry. Therefore, instead of using Yarn
to import the `@lyra` workspace via symlinked dependency like in other repos,
all references to `@lyra` must be relative paths.

tsconfig.json rewrites `@lyraAlias` to a relative path to `@lyra` folders to
prevent devs from manually having to write out a relative path.
