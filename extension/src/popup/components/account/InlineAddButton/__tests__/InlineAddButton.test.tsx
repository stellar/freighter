import React from "react";
import { render, screen } from "@testing-library/react";

import { Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { InlineAddButton } from "popup/components/account/InlineAddButton";

describe("InlineAddButton", () => {
  it("links to its route under its label", () => {
    render(
      <Wrapper routes={["/"]} state={{}}>
        <InlineAddButton
          label="Add token"
          route={ROUTES.searchAsset}
          data-testid="add-token-btn"
        />
      </Wrapper>,
    );

    const link = screen.getByTestId("add-token-btn");
    expect(link).toHaveTextContent("Add token");
    expect(link).toHaveAttribute("href", ROUTES.searchAsset);
  });
});
