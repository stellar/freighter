import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { SelectionTile } from "../index";

describe("SelectionTile", () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe("with all props", () => {
    it("renders icon, primary text, and secondary text", () => {
      render(
        <SelectionTile
          icon={<div data-testid="test-icon">Icon</div>}
          primaryText="Primary Text"
          secondaryText="Secondary Text"
          onClick={mockOnClick}
          testId="selection-tile-test"
        />,
      );

      expect(screen.getByTestId("selection-tile-test")).toBeInTheDocument();
      expect(screen.getByText("Primary Text")).toBeInTheDocument();
      expect(screen.getByText("Secondary Text")).toBeInTheDocument();
      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
      render(
        <SelectionTile
          icon={<div>Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
        />,
      );

      fireEvent.click(screen.getByText("Primary Text"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("without secondary text", () => {
    it("renders only primary text", () => {
      render(
        <SelectionTile
          icon={<div>Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
        />,
      );

      expect(screen.getByText("Primary Text")).toBeInTheDocument();
      expect(screen.queryByText("Secondary Text")).not.toBeInTheDocument();
    });
  });

  describe("isEmpty prop", () => {
    it("applies empty class when isEmpty is true", () => {
      render(
        <SelectionTile
          icon={<div>Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
          isEmpty
          testId="empty-tile"
        />,
      );

      const tile = screen.getByTestId("empty-tile");
      expect(tile).toHaveClass("SelectionTile--empty");
    });

    it("does not apply empty class when isEmpty is false", () => {
      render(
        <SelectionTile
          icon={<div>Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
          testId="not-empty-tile"
        />,
      );

      const tile = screen.getByTestId("not-empty-tile");
      expect(tile).not.toHaveClass("SelectionTile--empty");
    });
  });

  describe("shouldUseIconWrapper prop", () => {
    it("wraps icon in SelectionTile__icon div when shouldUseIconWrapper is true (default)", () => {
      const { container } = render(
        <SelectionTile
          icon={<div data-testid="test-icon">Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
        />,
      );

      const iconWrapper = container.querySelector(".SelectionTile__icon");
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper).toContainElement(screen.getByTestId("test-icon"));
    });

    it("wraps icon when shouldUseIconWrapper is explicitly true", () => {
      const { container } = render(
        <SelectionTile
          icon={<div data-testid="test-icon">Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
          shouldUseIconWrapper={true}
        />,
      );

      const iconWrapper = container.querySelector(".SelectionTile__icon");
      expect(iconWrapper).toBeInTheDocument();
      expect(iconWrapper).toContainElement(screen.getByTestId("test-icon"));
    });

    it("does not wrap icon when shouldUseIconWrapper is false", () => {
      const { container } = render(
        <SelectionTile
          icon={<div data-testid="test-icon">Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
          shouldUseIconWrapper={false}
        />,
      );

      const iconWrapper = container.querySelector(".SelectionTile__icon");
      expect(iconWrapper).not.toBeInTheDocument();

      // Icon should still be in content area
      const contentArea = container.querySelector(".SelectionTile__content");
      expect(contentArea).toContainElement(screen.getByTestId("test-icon"));
    });
  });

  describe("testId prop", () => {
    it("applies custom testId when provided", () => {
      render(
        <SelectionTile
          icon={<div>Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
          testId="custom-test-id"
        />,
      );

      expect(screen.getByTestId("custom-test-id")).toBeInTheDocument();
    });

    it("works without testId", () => {
      const { container } = render(
        <SelectionTile
          icon={<div>Icon</div>}
          primaryText="Primary Text"
          onClick={mockOnClick}
        />,
      );

      const tile = container.querySelector(".SelectionTile");
      expect(tile).toBeInTheDocument();
    });
  });

  describe("structure", () => {
    it("has correct DOM structure with wrapper", () => {
      const { container } = render(
        <SelectionTile
          icon={<div data-testid="test-icon">Icon</div>}
          primaryText="Primary Text"
          secondaryText="Secondary Text"
          onClick={mockOnClick}
        />,
      );

      const tile = container.querySelector(".SelectionTile");
      const content = container.querySelector(".SelectionTile__content");
      const icon = container.querySelector(".SelectionTile__icon");
      const text = container.querySelector(".SelectionTile__text");
      const primary = container.querySelector(".SelectionTile__primary");
      const secondary = container.querySelector(".SelectionTile__secondary");

      expect(tile).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(icon).toBeInTheDocument();
      expect(text).toBeInTheDocument();
      expect(primary).toBeInTheDocument();
      expect(secondary).toBeInTheDocument();
    });

    it("has correct DOM structure without wrapper", () => {
      const { container } = render(
        <SelectionTile
          icon={<div data-testid="test-icon">Icon</div>}
          primaryText="Primary Text"
          secondaryText="Secondary Text"
          onClick={mockOnClick}
          shouldUseIconWrapper={false}
        />,
      );

      const tile = container.querySelector(".SelectionTile");
      const content = container.querySelector(".SelectionTile__content");
      const icon = container.querySelector(".SelectionTile__icon");
      const text = container.querySelector(".SelectionTile__text");

      expect(tile).toBeInTheDocument();
      expect(content).toBeInTheDocument();
      expect(icon).not.toBeInTheDocument(); // No wrapper div
      expect(text).toBeInTheDocument();
      expect(screen.getByTestId("test-icon")).toBeInTheDocument(); // Icon still rendered
    });
  });
});
