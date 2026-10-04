import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface DrawerItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  selected?: boolean;
}

export function DrawerItem({
  icon,
  label,
  onPress,
  selected = false,
}: DrawerItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: selected ? theme.colors.surface : "transparent",
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={24}
        color={selected ? theme.colors.primary : theme.colors.textSecondary}
      />
      <Text
        style={[
          styles.label,
          {
            color: selected
              ? theme.colors.primary
              : theme.colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
});
