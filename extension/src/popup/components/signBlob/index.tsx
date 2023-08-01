import React from "react";
import { Card, Heading4 } from "@stellar/design-system";

import "./index.scss";

interface BlobProps {
  blob: string;
}

export const Blob = (props: BlobProps) => (
  <Card variant={Card.variant.highlight}>
    <Heading4>Signing data:</Heading4>
    <div className="Blob">{props.blob}</div>
  </Card>
);
