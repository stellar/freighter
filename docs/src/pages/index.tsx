// @ts-nocheck
import React from "react";

// Webpoack alias issue with @docusarus
// eslint-disable-next-line import/no-unresolved
import { Redirect } from "@docusaurus/router";

const Homepage = () => <Redirect to="/docs/guide/introduction" />;

export default Homepage;
