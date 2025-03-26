# Navigation

To navigate to other views in the popup, use the helper method `navigateTo` found in `popup/helpers/navigate`. This ensures that you will use the `history` API to navigate. This is important as the url structure differs slightly between the development and production environment. Using a method like setting `window.location` to a route, for example, will work in development, but not in production.

When using `navigateTo`, prefer using the enum `ROUTES` from `popup/constants/routes` rather than writing out the path.
