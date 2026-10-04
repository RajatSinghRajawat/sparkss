import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface ErrorStateProps {
  title?: string;
  message?: string;
  action?: React.ReactNode;
}

export function ErrorState({
  title = "Something went wrong",
  message = "Please try again later",
  action,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconWrapper,
          { backgroundColor: theme.colors.error + "20" },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.error}
        />
      </View>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
        {message}
      </Text>
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
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    marginTop: 20,
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
