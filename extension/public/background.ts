import {
  initContentScriptMessageListener,
  initExtensionMessageListener,
  initInstalledListener,
} from "background";

initContentScriptMessageListener();
initExtensionMessageListener();

initInstalledListener();
