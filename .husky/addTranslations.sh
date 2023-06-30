#!/bin/sh

yarn build:extension:translations
git diff --quiet || >&2 echo "Added translations commit. Please retry git push" && git add . && git commit -m "Added translations" && exit 1