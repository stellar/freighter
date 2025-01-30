/*
 * base64-arraybuffer
 * https://github.com/niklasvh/base64-arraybuffer
 *
 * Copyright (c) 2017-2023 Brett Zamir, 2012 Niklas von Hertzen
 * Licensed under the MIT license.
 */

/**
 * @typedef {number} Integer
 */

const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Use a lookup table to find the index.
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[/** @type {number} */ (chars.codePointAt(i))] = i;
}

/**
 * @param {ArrayBuffer} arraybuffer
 * @param {Integer} [byteOffset]
 * @param {Integer} [lngth]
 * @returns {string}
 */
export const encode = function (arraybuffer, byteOffset, lngth) {
  if (lngth === null || lngth === undefined) {
    lngth = arraybuffer.byteLength; // Needed for Safari
  }
  const bytes = new Uint8Array(
    arraybuffer,
    byteOffset || 0, // Default needed for Safari
    lngth,
  );
  const len = bytes.length;

  let base64 = "";
  for (let i = 0; i < len; i += 3) {
    base64 += chars[bytes[i] >> 2];
    base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    base64 += chars[bytes[i + 2] & 63];
  }

  if (len % 3 === 2) {
    base64 = base64.slice(0, -1) + "=";
  } else if (len % 3 === 1) {
    base64 = base64.slice(0, -2) + "==";
  }

  return base64;
};

/**
 * @param {string} base64
 * @param {{
 *   maxByteLength: number
 * }} [options]
 * @returns {ArrayBuffer}
 */
export const decode = function (base64, options) {
  const len = base64.length;

  if (len % 4) {
    throw new Error("Bad base64 length: not divisible by four");
  }

  let bufferLength = base64.length * 0.75;
  let p = 0;
  let encoded1, encoded2, encoded3, encoded4;

  if (base64.at(-1) === "=") {
    bufferLength--;
    if (base64.at(-2) === "=") {
      bufferLength--;
    }
  }

  // @ts-expect-error Second argument is not yet standard
  const arraybuffer = new ArrayBuffer(bufferLength, options),
    bytes = new Uint8Array(arraybuffer);

  for (let i = 0; i < len; i += 4) {
    // We know the result will not be undefined, as we have a text
    //   length divisible by four
    encoded1 = lookup[/** @type {number} */ (base64.codePointAt(i))];
    encoded2 = lookup[/** @type {number} */ (base64.codePointAt(i + 1))];
    encoded3 = lookup[/** @type {number} */ (base64.codePointAt(i + 2))];
    encoded4 = lookup[/** @type {number} */ (base64.codePointAt(i + 3))];

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }

  return arraybuffer;
};
