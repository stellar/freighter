#!/bin/bash

set -eo pipefail

xcodebuild -scheme Freighter -archivePath ./build/Freighter.xarchive build

xcodebuild -archivePath ./build/Freighter.xarchive \
            -exportOptionsPlist Freighter.plist \
            -exportPath ./build \
            -allowProvisioningUpdates \
            -exportArchive | xcpretty

xcrun altool --upload-package --apple-id $APPLE_ID --asc-public-id $APPLE_PUBLIC_ID -t ios -t macos -f build/Freighter.ipa --apiKey $API_KEY --apiIssuer $API_ISSUER --verbose
