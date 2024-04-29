// <reference types="react-scripts" />
declare module "*.png";

declare module "*.svg?react" {
  import React = require("react");

  export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
