#!/bin/bash

# Script to update version in extension files
# Usage: ./update-version.sh <version>
# Example: ./update-version.sh 5.35.4

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Version number is required${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 5.35.4"
    exit 1
fi

NEW_VERSION=$1

# Validate version format (basic semver check)
if ! [[ $NEW_VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}Error: Invalid version format. Expected format: X.Y.Z (e.g., 5.35.4)${NC}"
    exit 1
fi

# Define file paths
PACKAGE_JSON="extension/package.json"
MANIFEST_JSON="extension/public/static/manifest/v3.json"

# Check if files exist
if [ ! -f "$PACKAGE_JSON" ]; then
    echo -e "${RED}Error: $PACKAGE_JSON not found${NC}"
    exit 1
fi

if [ ! -f "$MANIFEST_JSON" ]; then
    echo -e "${RED}Error: $MANIFEST_JSON not found${NC}"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Using sed fallback...${NC}"
    USE_JQ=false
else
    USE_JQ=true
fi

echo -e "${GREEN}Updating version to ${NEW_VERSION}...${NC}"

if [ "$USE_JQ" = true ]; then
    # Use jq for safer JSON manipulation
    echo "Updating $PACKAGE_JSON..."
    jq --arg version "$NEW_VERSION" '.version = $version' "$PACKAGE_JSON" > "${PACKAGE_JSON}.tmp" && mv "${PACKAGE_JSON}.tmp" "$PACKAGE_JSON"

    echo "Updating $MANIFEST_JSON..."
    jq --arg version "$NEW_VERSION" '.version = $version | .version_name = $version' "$MANIFEST_JSON" > "${MANIFEST_JSON}.tmp" && mv "${MANIFEST_JSON}.tmp" "$MANIFEST_JSON"
else
    # Fallback to sed
    echo "Updating $PACKAGE_JSON..."
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON" && rm "${PACKAGE_JSON}.bak"

    echo "Updating $MANIFEST_JSON..."
    sed -i.bak "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_JSON"
    sed -i.bak "s/\"version_name\": \"[^\"]*\"/\"version_name\": \"$NEW_VERSION\"/" "$MANIFEST_JSON"
    rm "${MANIFEST_JSON}.bak"
fi

echo -e "${GREEN}✓ Successfully updated version to ${NEW_VERSION} in:${NC}"
echo "  - $PACKAGE_JSON"
echo "  - $MANIFEST_JSON"
echo ""
echo -e "${YELLOW}Don't forget to commit these changes!${NC}"
