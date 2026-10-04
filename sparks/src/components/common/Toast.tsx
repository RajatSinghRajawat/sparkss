import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme , fonts } from "../../theme";

interface ToastProps {
  message: string;
  variant?: "default" | "success" | "error";
}

export function Toast({
  message,
  variant = "default",
}: ToastProps) {
  const insets = useSafeAreaInsets();

  const variantColors = {
    default: theme.colors.card,
    success: theme.colors.success,
    error: theme.colors.error,
  };
  const bgColor = variantColors[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          bottom: insets.bottom + 24,
        },
      ]}
    >
      <Text
        style={[
          styles.message,
          {
            color: variant === "default" ? theme.colors.textPrimary : theme.colors.buttonText,
          },
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 24,
    right: 24,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontFamily: fonts.medium,
    fontSize: 15,
    textAlign: "center",
  },
});
