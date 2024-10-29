import { DEV_SERVER } from "@shared/constants/services";
import { POPUP_HEIGHT, POPUP_WIDTH } from "constants/dimensions";

export const isFullscreenMode = () =>
  window.innerHeight !== POPUP_HEIGHT &&
  window.innerWidth !== POPUP_WIDTH &&
  !DEV_SERVER;
