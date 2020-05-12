import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

const FormUl = styled.ul`
  list-style-type: none;
`;

const Welcome = () => {
  return (
    <nav>
      <FormUl>
        <li>
          <h1>
            <Link to="/create-password">I'm new!</Link>
          </h1>
        </li>
        <li>
          <h1>
            <Link to="/recover-account">I've done this before</Link>
          </h1>
        </li>
      </FormUl>
    </nav>
  );
};

export default Welcome;
