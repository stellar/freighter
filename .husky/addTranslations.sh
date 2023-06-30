#!/bin/sh

yarn build:extension:translations
git diff --quiet || >&2 echo "Added translations commit" exit 1