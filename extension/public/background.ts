import {
  initContentScriptMessageListener,
  initExtensionMessageListener,
  initInstalledListener,
  initAlarmListener,
  initSidebarBehavior,
  initSidebarConnectionListener,
} from "background";

function main() {
  initContentScriptMessageListener();
  initExtensionMessageListener();
  initInstalledListener();
  initAlarmListener();
  initSidebarBehavior();
  initSidebarConnectionListener();
}

main();
