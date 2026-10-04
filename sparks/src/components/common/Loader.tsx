import React from "react";
import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface LoaderProps {
  size?: "small" | "large";
  color?: string;
  message?: string;
}

export function Loader({
  size = "large",
  color = theme.colors.buttonPrimary,
  message,
}: LoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text
          style={[styles.message, { color: theme.colors.textSecondary }]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
});
