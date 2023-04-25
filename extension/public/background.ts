import {
  initContentScriptMessageListener,
  initExtensionMessageListener,
  initInstalledListener,
  initInitAlarmListener,
} from "background";

initContentScriptMessageListener();
initExtensionMessageListener();

initInstalledListener();
initInitAlarmListener();
