// typography.ts – Montserrat font theme

export const fonts = {
  regular: "Montserrat_400Regular",
  medium: "Montserrat_500Medium",
  semiBold: "Montserrat_600SemiBold",
  bold: "Montserrat_700Bold",
} as const;

export type FontWeight = keyof typeof fonts;
