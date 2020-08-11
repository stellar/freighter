// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import { JSDOM } from "jsdom";
import fetch from "isomorphic-unfetch";

// make a JSDOM thing so we can fuck with mount
const jsdom = new JSDOM("<!doctype html><html><body></body></html>");
const { window } = jsdom;

interface AnyObject {
  [key: string]: any;
}
function copyProps(src: AnyObject, target: AnyObject) {
  const props = Object.getOwnPropertyNames(src)
    .filter((prop) => typeof target[prop] === "undefined")
    .reduce(
      (result, prop) => ({
        ...result,
        [prop]: Object.getOwnPropertyDescriptor(src, prop),
      }),
      {},
    );
  Object.defineProperties(target, props);
}

global.window = (window as unknown) as Window & typeof global;
global.document = window.document;
global.fetch = window.fetch = fetch;
global.navigator = {
  ...window.navigator,
  userAgent: "jest",
};
global.localStorage = {
  setItem: jest.fn().mockReturnValue(null),
  getItem: jest.fn().mockReturnValue(null),
  removeItem: jest.fn().mockReturnValue(null),
  clear: jest.fn().mockReturnValue(null),
  length: 0,
  key: jest.fn().mockRejectedValue(null),
};
global.sessionStorage = {
  setItem: jest.fn().mockReturnValue(null),
  getItem: jest.fn().mockReturnValue(null),
  removeItem: jest.fn().mockReturnValue(null),
  clear: jest.fn().mockReturnValue(null),
  length: 0,
  key: jest.fn().mockRejectedValue(null),
};
global.window.open = jest.fn();
copyProps(window, global);
