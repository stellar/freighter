import { history } from "popup/constants/history";

export const navigateTo = (pathname: string) => history.push({ pathname });
