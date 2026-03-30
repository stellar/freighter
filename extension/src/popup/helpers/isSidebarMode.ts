// Guard against non-extension contexts: extension pages always load from
// chrome-extension:// (or moz-extension://), never from web origins.
export const isSidebarMode = () =>
  /^(chrome|moz)-extension:$/.test(window.location.protocol) &&
  new URLSearchParams(window.location.search).get("mode") === "sidebar";
