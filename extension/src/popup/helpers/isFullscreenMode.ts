import { DEV_SERVER } from "@shared/constants/services";
import { POPUP_HEIGHT, POPUP_WIDTH } from "constants/dimensions";
import { isSidebarMode } from "./isSidebarMode";

export const isFullscreenMode = () =>
  window.innerHeight !== POPUP_HEIGHT &&
  window.innerWidth !== POPUP_WIDTH &&
  !isSidebarMode() &&
  !DEV_SERVER;
