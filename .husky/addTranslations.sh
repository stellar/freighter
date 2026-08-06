#!/bin/sh
# Abort the commit if the translations build fails; without this the failed
# build was masked by the git add below always succeeding.
set -e

yarn build:extension:translations
git add extension/src/popup/locales/