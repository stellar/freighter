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
global.PRODUCTION = false;

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
