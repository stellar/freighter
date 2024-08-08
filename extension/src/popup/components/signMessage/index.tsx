import React from "react";
import { Card } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import "./index.scss";

interface BlobProps {
  message: string;
}

export const Message = (props: BlobProps) => {
  const { t } = useTranslation();

  return (
    <Card variant="secondary">
      <p>{t("Signing message")}:</p>
      <div className="Message">{props.message}</div>
    </Card>
  );
};
