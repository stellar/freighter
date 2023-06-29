#!/bin/sh

echo "hi"
yarn build:extension:translations
git commit -m "Add translations" -a