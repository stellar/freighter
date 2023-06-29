#!/bin/sh

nvm use default
yarn build:extension:translations
git commit -m "Add translations" -a