#!/bin/sh

yarn build:extension:translations
git diff --quiet || echo "Added translations commit" exit 1