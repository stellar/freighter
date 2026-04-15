import React from "react";
import { useTranslation } from "react-i18next";

import { getPunycodedDomain } from "helpers/urls";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";

import "./styles.scss";

export const PunycodedDomain = ({
  domain,
  title,
  isRow,
  ...props
}: {
  domain: string;
  title?: string;
  isRow?: boolean;
}) => {
  const { t } = useTranslation();
  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;

  const favicon = getSiteFavicon(domain);
  const validDomain = isDomainValid ? punycodedDomain : `xn-${punycodedDomain}`;

  return (
    <div
      className={`PunycodedDomain ${isRow ? "PunycodedDomain--row" : ""}`}
      {...props}
    >
      <div className="PunycodedDomain__favicon-container">
        <img
          className="PunycodedDomain__favicon"
          src={favicon}
          alt={t("Site favicon")}
        />
      </div>
      <div className="PunycodedDomain__domain">
        <strong>{title || validDomain}</strong>
      </div>
    </div>
  );
};
