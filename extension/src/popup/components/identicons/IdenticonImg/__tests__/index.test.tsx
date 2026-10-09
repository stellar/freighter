import React from "react";
import { render, screen } from "@testing-library/react";

import { IdenticonImg } from "../index";
import { VARIAL_AVATAR_COLORS } from "../colors";
import avatarFixtures from "./fixtures/avatarFixtures.json";

const layers = (svg: Element) => {
  const group = svg.querySelector("g[mask]")!;
  const [path1, path2] = Array.from(group.querySelectorAll("path"));
  return {
    base: group.querySelector("rect")!.getAttribute("fill"),
    layer1: {
      fill: path1.getAttribute("fill"),
      transform: path1.getAttribute("transform"),
    },
    layer2: {
      fill: path2.getAttribute("fill"),
      transform: path2.getAttribute("transform"),
    },
  };
};

describe("IdenticonImg", () => {
  it("renders an accessible avatar", () => {
    render(<IdenticonImg publicKey={avatarFixtures[0].publicKey} />);

    const avatar = screen.getByTestId("identicon-img");
    expect(avatar.tagName.toLowerCase()).toBe("svg");
    expect(avatar).toHaveAttribute("role", "img");
    expect(avatar).toHaveAttribute("aria-label", "account identicon");
  });

  // Mobile pins the same fixtures; a change here is a change to every
  // user's avatar on both platforms.
  it.each(avatarFixtures)(
    "renders the pinned avatar for $publicKey",
    ({ publicKey, ...expected }) => {
      render(<IdenticonImg publicKey={publicKey} />);
      expect(layers(screen.getByTestId("identicon-img"))).toEqual(expected);
    },
  );

  it("paints only fixed palette colors, so it is identical in every theme", () => {
    const { container } = render(
      <>
        {avatarFixtures.map(({ publicKey }) => (
          <IdenticonImg key={publicKey} publicKey={publicKey} />
        ))}
      </>,
    );

    const painted = Array.from(container.querySelectorAll("g[mask] [fill]"));
    expect(painted.length).toBeGreaterThan(0);
    painted.forEach((el) => {
      expect(VARIAL_AVATAR_COLORS).toContain(el.getAttribute("fill"));
    });
  });
});
