// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { JSDOM } from "jsdom";
import React from "react";
import fetch from "isomorphic-unfetch";
import chrome from "sinon-chrome/extensions";
import { TextEncoder } from "util";
import crypto from "crypto";
import "jest-localstorage-mock";
import "jsdom-global";

// make a JSDOM thing so we can fuck with mount
const jsdom = new JSDOM("<!doctype html><html><body></body></html>");
const { window } = jsdom;

class LocalStorageMock {
  private store: Record<string, any>;
  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  get = async (_key: string) => {
    return this.store;
  };

  set = async (params: Record<string, any>) => {
    this.store = {
      ...this.store,
      ...params,
    };
    return;
  };

  removeItem(key: string) {
    delete this.store[key];
  }
}

global.fetch = fetch;
window.fetch = fetch;
global.chrome = chrome;
global.TextEncoder = TextEncoder;
global.crypto = crypto.webcrypto;
window.crypto = crypto.webcrypto;
global.DEV_SERVER = true;
global.PRODUCTION = false;
global.EXPERIMENTAL = false;

if (!chrome.runtime) chrome.runtime = {};
if (!chrome.runtime.id) chrome.runtime.id = "history-delete";

global.browser = {};
global.browser.storage = {
  local: new LocalStorageMock(),
};
jest.mock("helpers/metrics", () => ({
  registerHandler: () => {},
}));

/* eslint-disable react/no-array-index-key */
jest.mock("react-i18next", () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  Trans: ({ children }: { children: React.ReactElement[] }) =>
    children.map((child, i) => {
      if (typeof child === "string") {
        return <span key={i}>{child}</span>;
      }
      return "";
    }),
}));
/* eslint-enable react/no-array-index-key */

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (element: React.ReactElement) => element,
}));
