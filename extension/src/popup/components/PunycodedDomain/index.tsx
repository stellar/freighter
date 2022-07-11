import React from "react";

import { getPunycodedDomain } from "helpers/urls";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";

import "./styles.scss";

export const PunycodedDomain = ({
  domain,
  domainTitle,
  isRow,
  ...props
}: {
  domain: string;
  domainTitle?: string;
  isRow?: boolean;
}) => {
  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;

  const favicon = getSiteFavicon(domain);

  return (
    <div
      className={`PunycodedDomain ${isRow ? "PunycodedDomain--row" : ""}`}
      {...props}
    >
      <div>
        <img
          className="PunycodedDomain__favicon"
          src={favicon}
          alt="Site favicon"
        />
      </div>
      <div className="PunycodedDomain__domain">
        <strong>
          {isDomainValid ? punycodedDomain : `xn-${punycodedDomain}`}
        </strong>
      </div>
      <div className="PunycodedDomain__title">{domainTitle}</div>
    </div>
  );
};
