#!/bin/bash

set -eo pipefail

# convert extension for apple platforms
xcrun safari-web-extension-converter ./build --project-location ./apple-build

xcodebuild  -project ./apple-build/Freighter/Freighter.xcodeproj -scheme Freighter -archivePath /tmp/build-archive.xcarchive archive

xcodebuild -archivePath /tmp/build-archive.xcarchive \
            -exportOptionsPlist /tmp/build-archive.xcarchive/Info.plist  \
            -exportPath ./final \
            -allowProvisioningUpdates \
            -exportArchive

xcrun altool --upload-package --apple-id $APPLE_ID -t ios -t macos -f final/Freighter.ipa --apiKey $API_KEY --apiIssuer $API_ISSUER --verbose
