// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { JSDOM } from "jsdom";
import React from "react";
import fetch from "isomorphic-unfetch";
import "jest-localstorage-mock";
import "jsdom-global";

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
global.TextDecoder = TextDecoder;

process.env.INDEXER_URL = "http://localhost:3002/api/v1";

jest.mock("helpers/metrics", () => ({
  registerHandler: () => {},
  emitMetric: () => {},
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
  Trans: ({ children }: { children: React.ReactElement }) => {
    if (typeof children === "string") {
      return <span>{children}</span>;
    }
    return "";
  },
}));
/* eslint-enable react/no-array-index-key */

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (element: React.ReactElement) => element,
}));
