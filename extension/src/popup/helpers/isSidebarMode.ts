export const isSidebarMode = () =>
  new URLSearchParams(window.location.search).get("mode") === "sidebar";
