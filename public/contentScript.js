import API from "../src/api";

const bodyTag = document.body;
const scriptTag = document.createElement("script");
scriptTag.setAttribute("async", "false");
scriptTag.textContent = `(${API.toString()})();`;
bodyTag.appendChild(scriptTag);
bodyTag.removeChild(scriptTag);
