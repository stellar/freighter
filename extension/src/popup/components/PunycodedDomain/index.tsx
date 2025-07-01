import React from "react";

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
          alt="Site favicon"
        />
      </div>
      <div className="PunycodedDomain__domain">
        <strong>{title || validDomain}</strong>
      </div>
    </div>
  );
};
