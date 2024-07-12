import React from "react";
import * as Sentry from "@sentry/browser";
import { Card } from "@stellar/design-system";

import "./index.scss";

interface BlobProps {
  blob: string;
}

export const Blob = (props: BlobProps) => {
  function renderBlob() {
    try {
      const displayBlob = atob(props.blob);
      return displayBlob;
    } catch (error) {
      Sentry.captureException(
        `Failed to convert blob to display - ${props.blob}`,
      );
      return JSON.stringify(props.blob);
    }
  }

  return (
    <Card variant="secondary">
      <p>Signing data:</p>
      <div className="Blob">{renderBlob()}</div>
    </Card>
  );
};
