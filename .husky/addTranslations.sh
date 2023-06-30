#!/bin/sh

yarn build:extension:translations
git diff || >&2 echo "Adding translations commit. Please retry git push" && git add . && git commit -m "Added translations" && exit 1