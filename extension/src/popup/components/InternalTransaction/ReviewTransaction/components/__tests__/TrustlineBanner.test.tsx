import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { TrustlineBanner } from "../TrustlineBanner";

describe("TrustlineBanner", () => {
  it("shows the token code and fires onClick", () => {
    const onClick = jest.fn();
    render(
      <Wrapper state={{}} routes={["/"]}>
        <TrustlineBanner tokenCode="AQUA" onClick={onClick} />
      </Wrapper>,
    );
    expect(
      screen.getByText("This will add a trustline to {{code}}"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("review-tx-trustline-banner"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
