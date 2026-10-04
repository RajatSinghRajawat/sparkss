import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface CheckboxProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  disabled = false,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onToggle(!checked)}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.container, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: checked ? theme.colors.primary : theme.colors.surface,
            borderColor: checked ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {checked && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </View>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 16,
    flex: 1,
  },
});
