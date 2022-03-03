import React from "react";

import "./styles.scss";

export const PasswordRequirements = () => (
  <div className="PasswordRequirements">
    <ul className="PasswordRequirements__list">
      <li>Min 8 characters</li>
      <li>At least one uppercase letter</li>
    </ul>
  </div>
);
