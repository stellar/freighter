// <reference types="react-scripts" />
declare module "*.png";

// @svgr/webpack exports the React component as the module's default export.
declare module "*.svg?react" {
  import * as React from "react";

  const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
