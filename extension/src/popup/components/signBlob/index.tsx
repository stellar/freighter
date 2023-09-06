import React from "react";
import { Card, Heading } from "@stellar/design-system";

import "./index.scss";

interface BlobProps {
  blob: string;
}

export const Blob = (props: BlobProps) => (
  <Card variant="secondary">
    <Heading size="md" as="h4">
      Signing data:
    </Heading>
    <div className="Blob">{props.blob}</div>
  </Card>
);
