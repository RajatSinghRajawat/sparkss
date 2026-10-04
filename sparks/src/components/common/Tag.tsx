import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface TagProps {
  label: string;
  variant?: "default" | "primary" | "success" | "error";
}

export function Tag({ label, variant = "default" }: TagProps) {
  const variantStyles = {
    default: {
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
    },
    primary: {
      backgroundColor: theme.colors.primary,
      color: "#FFFFFF",
    },
    success: {
      backgroundColor: theme.colors.success,
      color: "#FFFFFF",
    },
    error: {
      backgroundColor: theme.colors.error,
      color: "#FFFFFF",
    },
  };
  const styles_ = variantStyles[variant];

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: styles_.backgroundColor },
      ]}
    >
      <Text style={[styles.label, { color: styles_.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
});
