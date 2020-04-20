// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { KeyManager, KeyManagerPlugins } from "@stellar/wallet-sdk";
import { SERVICE_TYPES } from "../src/statics";

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            css: ["div"],
          }),
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message === "runContentScript") {
    chrome.tabs.executeScript({
      file: "contentScript.min.js",
    });
  }
});

chrome.extension.onConnect.addListener(function(port) {
  console.log("Connected .....");
  port.onMessage.addListener(function(msg) {
    console.log("message recieved" + msg);
    port.postMessage("Hi Popup.js");
  });
});

chrome.runtime.onMessageExternal.addListener(async function(
  request,
  sender,
  sendResponse,
) {
  const KEY_STORE = "keyMetadata";
  const localKeyStore = new KeyManagerPlugins.LocalStorageKeyStore();
  localKeyStore.configure({ storage: localStorage });
  const keyManager = new KeyManager({
    keyStore: localKeyStore,
  });
  keyManager.registerEncrypter(KeyManagerPlugins.ScryptEncrypter);

  console.log(request.keyMetadata);
  if (request.type === SERVICE_TYPES.CREATE_ACCOUNT) {
    let storeData;

    try {
      storeData = await keyManager.storeKey(request.keyMetadata);
    } catch (e) {
      console.error(e);
    }

    localStorage.setItem(KEY_STORE, JSON.stringify(storeData));
  }

  if (request.type === SERVICE_TYPES.LOAD_ACCOUNT) {
    let key;
    const keyMetadata = JSON.parse(localStorage.getItem("keyMetadata"));
    try {
      key = await keyManager.loadKey(keyMetadata.id, "pass");
    } catch (e) {
      console.error(e);
    }

    const {
      key: { publicKey },
    } = key;

    sendResponse({ publicKey });
  }
});
