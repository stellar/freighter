# Lyra API

This subrepo builds a wrapper around the messaging system used to interact with
the Lyra extension. Client applications will be able to install this package
from npm and then integrate with Lyra using dev-friendly methods like
`getPublicKey`

## Installation

Before this can be imported in another project in this monorepo, run
`yarn build` in this directory to create the built package.

## `@shared` import

Because this package needs to be packaged and published, it cannot have any
dependencies that are not on the npm registry. Therefore, instead of using Yarn
to import the `@shared` workspace via symlinked dependency like in other repos,
`@shared` files are loaded as local files

tsconfig.json rewrites `@shared` to a relative path to `@shared` folders to
prevent devs from manually having to write out a relative path.
