/* 
  This object can store data from `popup` without having to pass it as function params.
  Generally, we prefer passing data as function params, but there are cases where we want to transmit
  lots of data on every call. This is is a way to do that.
*/

export const popupStoreFacade = {
  currentStore: null as any,
};
