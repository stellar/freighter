import React from "react";
import styled from "styled-components";

const TooltipEl = styled.span`
  background: yellow;
  color: black;
  font-size: 0.7em;
  margin-top: -4em;
  position: absolute;
  visibility: hidden;
  text-shadow: none;
`;

interface TooltipProps {
  className?: string;
  text: string;
}

const Tooltip = ({ className, text }: TooltipProps) => (
  <TooltipEl className={className}>{text}</TooltipEl>
);

export default Tooltip;
