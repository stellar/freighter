#!/bin/bash

npx expo export --platform web

# Set the base directory
BASE_DIR="."

# Move files into dist directory
echo "Moving files to dist..."
cp "$BASE_DIR/platform/extension/background/background.js" "$BASE_DIR/dist/"
cp "$BASE_DIR/platform/extension/content-script/content-script.js" "$BASE_DIR/dist/"
cp "$BASE_DIR/manifest.json" "$BASE_DIR/dist/"

# Rename files and directories
echo "Renaming files and directories..."
if [ -f "$BASE_DIR/dist/_sitemap.html" ]; then
    mv "$BASE_DIR/dist/_sitemap.html" "$BASE_DIR/dist/sitemap.html"
fi

if [ -d "$BASE_DIR/dist/_expo" ]; then
    mv "$BASE_DIR/dist/_expo" "$BASE_DIR/dist/expo"
fi

# Replace all instances of "_expo" with "expo" in the dist directory
echo "Replacing '_expo' with 'expo' in dist..."
find "$BASE_DIR/dist" -type f -exec grep -Iq . {} \; -and -exec sed -i '' 's/_expo/expo/g' {} +

echo "All tasks completed!"
