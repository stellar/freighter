import React from "react";

import { getPunycodedDomain } from "helpers/urls";
import { getSiteFavicon } from "popup/helpers/getSiteFavicon";

import "./styles.scss";

export const PunycodedDomain = ({
  domain,
  domainTitle,
  ...props
}: {
  domain: string;
  domainTitle?: string;
}) => {
  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;

  const favicon = getSiteFavicon(domain);

  return (
    <div className="PunycodedDomain" {...props}>
      <div>
        <img src={favicon} alt="Site favicon" />
      </div>
      <div className="PunycodedDomain--domain">
        <strong>
          {isDomainValid ? punycodedDomain : `xn-${punycodedDomain}`}
        </strong>
      </div>
      <div className="PunycodedDomain--title">{domainTitle}</div>
    </div>
  );
};
