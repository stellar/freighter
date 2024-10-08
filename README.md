# Freighter

Freighter is a non-custodial wallet extension that enables you to sign Stellar transactions via your browser. Learn more at [freighter.app](https://www.freighter.app/).

## Yarn Workspaces

This repo is constructed using yarn workspaces and consists of the 4 sections:

- the browser extension (`/extension`)
- the client-facing SDK (`/@stellar/freighter-api`)
- the docs (`/docs`)
- some shared files that the above use (`/@shared/*`)

## Prerequisites

You will need

- Node (>=21): https://nodejs.org/en/download/
- Yarn (v1.22.5 or newer): https://classic.yarnpkg.com/en/docs/install

## Build the extension

To simply build a production version of the extension, install the prerequisites then navigate to this root folder in your command line and run these 2 steps:

```
yarn setup
```

followed by

```
yarn build:extension:production
```

This will generate the files that make up the extension in `extension/build`

## Starting a dev environment

```
yarn setup
yarn start
```

This will start up multiple watching builds in parallel:

- The `@stellar/freighter-api` npm module
- The docs, serving on `localhost:3000`
- A dev server with the webapp running in the extension, serving on
  `localhost:9000`
- The actual built extension, able to be installed in Chrome, in `build/`

Each of these will build in response to editing their source.

These can be started individually with `yarn start:\<workspace name\>` where
`\<workspace name\>` is one of:

- `freighter-api`
- `docs`
- `extension`

```
yarn build
```

This will produce final output for the docs, the `@stellar/freighter` npm module, and
the extension.

`yarn build:\<workspace name\>`, like the equivalent start commands, will build
an individual workspace.

### Testing for Safari

First you should allow unsigned extension in your safari session. This resets every time Safari shuts down.
https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension#3744467

Next, run the Safari Extension Converter locally to convert Freighter to an xcode project.
Example from the project root -
`xcrun safari-web-extension-converter freighter/extension/build --project-location freighter-safari`

That should launch your project in xcode. You should run the project, with a target of macos. If you have not allowed unsigned extensions, you will see a related warning but otherwise you should see Freighter launched on your Safari instance.

### Useful URLs:

[The popup webapp](http://localhost:9000/#/)

[The `getPublicKey` playground](http://localhost:3000/docs/playground/getPublicKey)
[The `signTransaction` playground](http://localhost:3000/docs/playground/signTransaction)

It's important to note that these two won't interact with the _dev server_ popup
UI on `localhost:9000` — you'll need to re-install the unpacked extension each
time you make a change.

### Importing a workspace

In some cases, you will want to import a workspace into another. For example, in
`extension` we need to import `@shared/constants`. To do this, simply add
`@shared/constants` to the dependencies list in package.json in `extension`. Yarn
symlinks all the workspaces, so doing so will allow you to import files from the
`@shared/constants` workspace as if it were a published npm package.

### Dependencies

Many dev dependencies (such as Typescript, linters, Webpack, etc.) have been moved to the root `package.json` to allow devs to upgrade these libraries all in one place.

### Pushing to repo

This repo will run a pre-push hook before pushing. This hook will run the cmd `yarn build:extension:translations` to check if any strings in the extension need to be added to the translations JSON. If there is no need to update the translations JSON, the push will go through. If there is a need to update, the changes will be automatically committed to your branch and the push will be aborted. You will need to run `git push` again.

NOTE: If you're using nvm and run into an error where the git hook is using an incompatible version of node, create a file `~/.huskryc` on your system and added the following:

```
# This loads nvm.sh, sets the correct PATH before running hook, and ensures the project version of Node
export NVM_DIR="$HOME/.nvm"

[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# If you have an .nvmrc file, we use the relevant node version
if [[ -f ".nvmrc" ]]; then
  nvm use
fi
```

This will instruct the git hook to use the .nvmrc found in this repo.
