// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { JSDOM } from "jsdom";
import crypto from "crypto";
import React from "react";
import fetch from "isomorphic-unfetch";
import "jest-localstorage-mock";
import "jsdom-global";
import { TextEncoder, TextDecoder } from "util";

// make a JSDOM thing so we can fuck with mount
const jsdom = new JSDOM("<!doctype html><html><body></body></html>");
const { window } = jsdom;

global.fetch = fetch;
window.fetch = fetch;
global.DEV_SERVER = true;
global.DEV_EXTENSION = true;
global.PRODUCTION = false;
global.EXPERIMENTAL = false;
global.TextEncoder = TextEncoder;
// @ts-expect-error
global.TextDecoder = TextDecoder;

Object.defineProperty(global.self, "crypto", {
  value: {
    getRandomValues: crypto.getRandomValues,
    subtle: crypto.webcrypto.subtle,
  },
});

process.env.INDEXER_URL = "http://localhost:3002/api/v1";

jest.mock("helpers/metrics", () => ({
  registerHandler: () => {},
  emitMetric: () => {},
}));

jest.mock("react-i18next", () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: () => new Promise(() => {}),
    },
  }),
  Trans: ({ children }: { children: React.ReactElement }) => {
    if (typeof children === "string") {
      return <span>{children}</span>;
    }
    return "";
  },
}));

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (element: React.ReactElement) => element,
}));
