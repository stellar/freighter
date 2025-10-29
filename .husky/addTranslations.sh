#!/bin/sh

yarn build:extension:translations
git diff --quiet || (echo "Adding translations commit. Please retry git push" && git add extension/src/popup/locales/ && git commit -m "Added translations" && exit 1)