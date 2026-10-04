import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = "folder-open-outline",
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name={icon}
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      {message && (
        <Text
          style={[styles.message, { color: theme.colors.textSecondary }]}
        >
          {message}
        </Text>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    marginTop: 16,
    textAlign: "center",
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  action: {
    marginTop: 24,
  },
});
