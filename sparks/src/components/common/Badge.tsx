import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface BadgeProps {
  count: number;
  max?: number;
  variant?: "primary" | "secondary" | "error";
  size?: "sm" | "md";
}

export function Badge({
  count,
  max = 99,
  variant = "error",
  size = "md",
}: BadgeProps) {
  const display = count > max ? `${max}+` : String(count);
  const colors = {
    primary: theme.colors.buttonPrimary,
    secondary: theme.colors.secondary,
    error: theme.colors.error,
  };
  const bgColor = colors[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          minWidth: size === "md" ? 22 : 18,
          height: size === "md" ? 22 : 18,
          borderRadius: size === "md" ? 11 : 9,
        },
      ]}
    >
      <Text style={[styles.text, { fontSize: size === "md" ? 12 : 10 }]}>
        {display}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
  },
});
