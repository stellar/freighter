#!/bin/sh

yarn build:extension:translations
git diff --quiet && git diff --staged --quiet || echo "hi" && echo "Adding trannslations commit. Please retry git push" && git add . && git commit -m "Added translations" && exit 1