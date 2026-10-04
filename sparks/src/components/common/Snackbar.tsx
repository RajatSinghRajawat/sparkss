import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme , fonts } from "../../theme";

interface SnackbarProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Snackbar({
  message,
  actionLabel,
  onAction,
}: SnackbarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.buttonPrimary,
          bottom: insets.bottom + 24,
        },
      ]}
    >
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.action}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  message: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: theme.colors.buttonText,
  },
  action: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: theme.colors.secondary,
    marginLeft: 16,
  },
});
