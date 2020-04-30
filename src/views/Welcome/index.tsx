import React from "react";
import { Link } from "react-router-dom";

const Welcome = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/create-password">I'm new!</Link>
        </li>
        <li>
          <Link to="/recover-account">I've done this before</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Welcome;
