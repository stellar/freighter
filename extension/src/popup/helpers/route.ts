export const getPathFromRoute = ({
  fullRoute,
  basePath,
}: {
  fullRoute: string;
  basePath: string;
}) => {
  const [_, path] = fullRoute.split(basePath);
  if (!path) {
    return fullRoute;
  }
  return path;
};
