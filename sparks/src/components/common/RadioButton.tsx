import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface RadioButtonProps {
  selected: boolean;
  onSelect: () => void;
  label?: string;
  disabled?: boolean;
}

export function RadioButton({
  selected,
  onSelect,
  label,
  disabled = false,
}: RadioButtonProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onSelect()}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.container, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.outer,
          {
            borderColor: selected ? theme.colors.primary : theme.colors.border,
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.inner,
              { backgroundColor: theme.colors.primary },
            ]}
          />
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
  outer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  inner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 16,
    flex: 1,
  },
});
