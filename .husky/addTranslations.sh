#!/bin/sh

yarn build:extension:translations
git diff --quiet || >&2 echo "Added translations commit. Please retry git push" && exit 1