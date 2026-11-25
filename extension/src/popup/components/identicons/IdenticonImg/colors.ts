// Varial Blue steps, by ramp: the same values as varialPalette.scss, but fixed
// rather than theme tokens, so an avatar never changes with the theme.
const VARIAL_BLUE = {
  dark09: "#1677ff",
  light05: "#c8e0ff",
  light08: "#73a5ff",
  light09: "#0050ff",
  light12: "#0e2b6c",
};

// Marble avatars use three consecutive entries (wrapping), so order is part of
// the design. Must match freighter-mobile's VARIAL_AVATAR_COLORS.
export const VARIAL_AVATAR_COLORS = [
  VARIAL_BLUE.dark09,
  VARIAL_BLUE.light05,
  VARIAL_BLUE.light12,
  VARIAL_BLUE.light09,
  VARIAL_BLUE.light08,
];
