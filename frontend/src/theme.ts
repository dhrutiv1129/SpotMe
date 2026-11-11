// Keep the original SpotMe brand colors available; semantic roles control usage.
export const palette = {
  charcoal: "#18211C",
  forest: "#1D3025",
  forestRaised: "#354B3C",
  cream: "#F6F5EF",
  white: "#FFFFFF",
  sage: "#B6C4B4",
  grayGreen: "#687269",
  outline: "#9AA196",
  brandGreen: "#267849",
  lime: "#DAEF9E",
  red: "#B9362A",
  blush: "#FCEBE4",
} as const;

export const colors = {
  background: palette.charcoal,
  surface: palette.forest,
  ink: palette.cream,
  hero: palette.forest,
  muted: palette.sage,
  green: palette.lime,
  pale: palette.forestRaised,
  lime: palette.lime,
  border: palette.grayGreen,
  inputBorder: palette.outline,
  soft: palette.forestRaised,
  activityMedium: palette.brandGreen,
  danger: palette.red,
  dangerSoft: palette.forest,
  errorText: palette.blush,
  onAccent: palette.charcoal,
  onDanger: palette.white,
  onHero: palette.cream,
  overlay: "rgba(0, 0, 0, 0.64)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  screen: 20,
  xl: 24,
  xxl: 32,
} as const;
export const radii = {
  small: 8,
  control: 12,
  card: 16,
  sheet: 24,
  pill: 999,
} as const;
export const typography = {
  title: { fontSize: 28, lineHeight: 36, fontWeight: "700" },
  section: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "600" },
  caption: { fontSize: 12, lineHeight: 18 },
} as const;
export const controls = { minTarget: 48, inputHeight: 52 } as const;
