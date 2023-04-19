export const browser = {
  tabs: {
    create: ({ url }: { url: string }) => window.open(url),
  },
};
