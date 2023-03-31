const core = require('@actions/core')
const fs = require('fs')
const glob = require('glob')
const chromeWebstoreUpload = require('./chrome-extension-upload')

/*
  Forked from https://github.com/mnao305/chrome-extension-upload
  It uses a broken token fetch workflow after version 2.0, through this dependency -
  https://github.com/fregante/chrome-webstore-upload
*/

function uploadFile(
  webStore,
  filePath,
  publishFlg,
  publishTarget
) {
  const myZipFile = fs.createReadStream(filePath)

  webStore
    .fetchToken()
    .then((token) => {
      console.log(token)
      webStore
        .uploadExisting(myZipFile, token)
        .then((uploadRes) => {
          console.log('Uploading bundle')
          console.log(uploadRes)
          core.debug(uploadRes)
          if (publishFlg === 'true') {
            webStore
              .publish(publishTarget, token)
              .then((publishRes) => {
                console.log('Publishing bundle')
                core.debug(publishRes)
                process.exitCode = 0
                return
              })
              .catch((e) => {
                core.error(e)
                  core.setFailed(
                    'publish error - You will need to access the Chrome Web Store Developer Dashboard and publish manually.'
                  )
              })
          }
        })
        .catch((e) => {
          console.log(e)
          core.error(e)
          core.setFailed(
            'upload error - You will need to go to the Chrome Web Store Developer Dashboard and upload it manually.'
          )
        })
    })
}

async function run() {
  try {
    const filePath = core.getInput('file-path', {required: true})
    const extensionId = core.getInput('extension-id', {required: true})
    const clientId = core.getInput('client-id', {required: true})
    const clientSecret = core.getInput('client-secret', {required: true})
    const refreshToken = core.getInput('refresh-token', {required: true})
    const globFlg = core.getInput('glob')
    const publishFlg = core.getInput('publish')
    const publishTarget = core.getInput('publish-target')

    const webStore = chromeWebstoreUpload({
      extensionId,
      clientId,
      clientSecret,
      refreshToken
    })

    if (globFlg === 'true') {
      const files = glob.sync(filePath)
      if (files.length > 0) {
        uploadFile(webStore, files[0], publishFlg, publishTarget)
      } else {
        core.setFailed('No files to match.')
      }
    } else {
      uploadFile(webStore, filePath, publishFlg, publishTarget)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()