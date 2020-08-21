import React from "react";

const CopyToClipboard = ({ onCopy, children, ...props }) => (
  <div {...props} onClick={() => onCopy()}>
    {children}
  </div>
);

export default CopyToClipboard;
