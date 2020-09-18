import { ROUTES } from "popup/constants/routes";
import { history } from "popup/constants/history";

export const navigateTo = (path: ROUTES, queryParams?: string) => {
    const pathname = queryParams ? `${path}${queryParams}` : path;
    history.push({ pathname });
};
