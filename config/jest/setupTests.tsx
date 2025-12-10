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
global.__PACKAGE_VERSION__ = "5.0.0";

Object.defineProperty(global.self, "crypto", {
  value: {
    getRandomValues: crypto.getRandomValues,
    subtle: crypto.webcrypto.subtle,
  },
});

process.env.INDEXER_URL = "http://localhost:3002/api/v1";
process.env.INDEXER_V2_URL = "http://localhost:3003/api/v1";

jest.mock("helpers/metrics", () => ({
  registerHandler: () => {},
  emitMetric: () => {},
  storeBalanceMetricData: () => {},
}));

jest.mock("popup/App", () => ({
  store: {
    getState: () => ({
      cache: {},
    }),
  },
}));

// Mock i18next before react-i18next
jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    use: jest.fn().mockReturnThis(),
    init: jest.fn().mockResolvedValue(undefined),
    changeLanguage: jest.fn().mockResolvedValue(undefined),
    t: (str: string) => str,
    services: {
      languageDetector: {
        detect: jest.fn().mockReturnValue("en"),
      },
    },
  },
}));

jest.mock("i18next-resources-to-backend", () => {
  return jest.fn(() => ({
    type: "backend",
    init: jest.fn(),
  }));
});

jest.mock("i18next-browser-languagedetector", () => {
  return jest.fn(() => ({
    type: "languageDetector",
    detect: jest.fn().mockReturnValue("en"),
    init: jest.fn(),
  }));
});

jest.mock("react-i18next", () => ({
  // this mock makes sure any components using the translate hook can use it without a warning being shown
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: {
      changeLanguage: jest.fn().mockResolvedValue(undefined),
      t: (str: string) => str,
      services: {
        languageDetector: {
          detect: jest.fn().mockReturnValue("en"),
        },
      },
    },
  }),
  Trans: ({ children }: { children: React.ReactElement }) => {
    if (typeof children === "string") {
      return <span>{children}</span>;
    }
    return "";
  },
  initReactI18next: {
    type: "postProcessor",
    init: jest.fn(),
  },
}));

jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  createPortal: (element: React.ReactElement) => element,
}));
