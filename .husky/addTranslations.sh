#!/bin/sh
set -e

# Regenerate the locale catalogs from `t()` calls in the source, then stage them.
# `set -e` matters: without it a failing build (e.g. a webpack config error) is
# swallowed, `git add` still runs, and the hook reports success while silently
# skipping catalog generation entirely.
yarn build:extension:translations
git add extension/src/popup/locales/
