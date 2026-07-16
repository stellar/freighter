declare module "*.svg" {
  const content: string;
  export default content;
}

// TypeScript 6 requires side-effect imports (e.g. `import "./styles.scss"`)
// to resolve to a declared module; these are handled by webpack loaders.
declare module "*.scss";

declare module "*.css";

declare module "qrcode.react";

declare module "react-identicons";

declare module "@stellar-asset-lists/sdk";
