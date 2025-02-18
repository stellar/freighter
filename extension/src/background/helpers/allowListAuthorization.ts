import { getPunycodedDomain } from "helpers/urls";

export const isSenderAllowed = ({
  allowListSegment,
  domain,
}: {
  allowListSegment: string[];
  domain: string;
}) => allowListSegment.includes(getPunycodedDomain(domain));
