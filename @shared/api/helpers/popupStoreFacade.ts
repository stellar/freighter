/* 
  This object holds the store from `popup` without having to pass it as a function param.
  Generally, we prefer passing data from the `popup` store as function params, but there are cases where we want to 
  transmit the whole state without having to manually pass it on every call. This is a way for the background to have
  access to all of the popup's store. 
*/

export const popupStoreFacade = {
  currentStore: null as any,
};
