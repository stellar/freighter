import { useLocation } from "react-router-dom";

export const useIsSwap = () => {
  const location = useLocation();
  return location.pathname ? location.pathname.includes("swap") : false;
};
