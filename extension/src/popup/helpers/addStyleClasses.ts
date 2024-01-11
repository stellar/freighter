export const addStyleClasses = (classes: string[]) =>
  [...classes].filter(Boolean).join(" ");
