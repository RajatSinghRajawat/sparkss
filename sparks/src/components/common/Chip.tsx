import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  onClose?: () => void;
}

export function Chip({
  label,
  selected = false,
  onPress,
  onClose,
}: ChipProps) {
  const content = (
    <>
      <Text
        style={[
          styles.label,
          {
            color: selected ? theme.colors.buttonText : theme.colors.textPrimary,
          },
        ]}
      >
        {label}
      </Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name="close-circle"
            size={18}
            color={selected ? theme.colors.buttonText : theme.colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </>
  );

  const containerStyle = [
    styles.chip,
    {
      backgroundColor: selected ? theme.colors.buttonPrimary : theme.colors.surface,
      borderColor: selected ? theme.colors.buttonPrimary : theme.colors.border,
    },
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={containerStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
