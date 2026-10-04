import React from "react";
import { Switch, View, Text, StyleSheet, Platform } from "react-native";
import { theme , fonts } from "../../theme";

interface SwitchToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function SwitchToggle({
  value,
  onValueChange,
  label,
  disabled = false,
}: SwitchToggleProps) {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      )}
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: theme.colors.surface,
          true: theme.colors.primary,
        }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 16,
    flex: 1,
  },
});
