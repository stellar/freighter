import React from "react";
import packageJson from "../../../../@stellar/freighter-api/package.json";

export const VersionedUrl = () => (
  <p>
    <code>{`<head><script src='https://cdnjs.cloudflare.com/ajax/libs/stellar-freighter-api/${packageJson.version}/index.min.js' /></head>`}</code>
  </p>
);
