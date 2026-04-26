export const typography = {
  hero: 48,
  title: 32,
  sectionTitle: 22,
  body: 16,
  bodySmall: 14,
  caption: 12,
  metric: 18,
} as const;

export type AppTypography = typeof typography;
