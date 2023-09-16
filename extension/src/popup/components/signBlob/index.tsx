import React from "react";
import * as Sentry from "@sentry/browser";
import { Card, Heading } from "@stellar/design-system";

import "./index.scss";

interface BlobProps {
  blob: string;
}

export const Blob = (props: BlobProps) => {
  let displayBlob = props.blob;

  try {
    displayBlob = atob(props.blob);
  } catch (error) {
    Sentry.captureException(
      `Failed to convert blob to display - ${props.blob}`,
    );
  }

  return (
    <Card variant="secondary">
      <Heading size="md" as="h4">
        Signing data:
      </Heading>
      <div className="Blob">{displayBlob}</div>
    </Card>
  );
};
