export const FAVICON_URL = "https://www.google.com/s2/favicons?sz=24&domain=";

export const getSiteFavicon = (url: string) => `${FAVICON_URL}${url}`;
