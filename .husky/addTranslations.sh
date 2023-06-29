#!/bin/sh

yarn build:extension:translations
git diff --quiet || git commit -m "Add translations" -a