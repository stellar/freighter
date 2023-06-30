#!/bin/sh

yarn build:extension:translations
git diff --quiet || echo "Adding trannslations commit. Please retry git push" &&  exit 1