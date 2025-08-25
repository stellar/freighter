import React from "react";

import "./index.scss";

interface BlobProps {
  message: string;
}

export const Message = (props: BlobProps) => {
  return (
    <div className="SignMessageData">
      <div className="Message">{props.message}</div>
    </div>
  );
};
