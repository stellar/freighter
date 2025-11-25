import React from "react";
import JSONPretty from "react-json-pretty";
import { captureException } from "@sentry/browser";
import "react-json-pretty/themes/monikai.css";

import "./index.scss";

interface BlobProps {
  message: string;
  prefix: string;
}

const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

export const Message = (props: BlobProps) => {
  const isJson = isJsonString(props.message);
  return (
    <div className="SignMessageData">
      <div className="Message">
        <div className="Message__Prefix">{props.prefix}</div>
        {isJson ? (
          <JSONPretty
            json={props.message}
            onJSONPrettyError={(e) =>
              captureException(
                `Error parsing JSON in Sign Message: ${e.message}`,
              )
            }
          />
        ) : (
          <div className="Message__Content">{props.message}</div>
        )}
      </div>
    </div>
  );
};
