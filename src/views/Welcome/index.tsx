import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { newTabHref } from "helpers";
import { applicationStateSelector } from "ducks/authServices";
import { APPLICATION_STATE } from "statics";

const FormUl = styled.ul`
  list-style-type: none;
`;

const Welcome = () => {
  const applicationState = useSelector(applicationStateSelector);
  return (
    <nav>
      <FormUl>
        {applicationState === APPLICATION_STATE.APPLICATION_STARTED ? (
          <>
            <li>
              <h1>
                <a
                  href={newTabHref("/create-password")}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  I'm new!
                </a>
              </h1>
            </li>
            <li>
              <h1>
                <Link to="/recover-account">I've done this before</Link>
              </h1>
            </li>
          </>
        ) : (
          <>
            <li>
              <h1>
                <Link to="/mnemonic-phrase" target="_blank">
                  Continue application process
                </Link>
              </h1>
            </li>
          </>
        )}
      </FormUl>
    </nav>
  );
};

export default Welcome;
