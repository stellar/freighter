import React from "react";

interface RetinaImgProps {
  retina: string;
  src?: string;
  alt: string;
}

export const RetinaImg = ({ retina = "", src = "", alt }: RetinaImgProps) => (
  <img src={src || retina} srcSet={`${retina} 2x`} alt={alt} />
);
