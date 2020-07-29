# Lyra

This repo is constructed using yarn workspaces and consists of the 4 sections:

- the browser extension (`/extension`)
- the client-facing SDK (`/@stellar/lyra-sdk`)
- the docs (`/docs`)
- some shared files that the above use (`/@lyra/*`)

## Getting Started

From the project root, run `yarn install`. This will install all shared node modules in the root while each workspace will get a `node_modules` folder consisting of only the packages specific to that workspace.

## Importing a workspace

In some cases, you will want to import a workspace into another. For example, in `extension` we need to import `@lyra/constants`. To do this, simply add `@lyra/constants` to the dependencies list in package.json in `extension`. Yarn symlinks all the workspaces, so doing so will allow you to import files from the `@lyra/constants` workspace as if it were a published npm package.
