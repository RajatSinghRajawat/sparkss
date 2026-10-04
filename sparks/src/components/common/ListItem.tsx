import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon = "chevron-forward",
  onPress,
}: ListItemProps) {
  const content = (
    <>
      {leftIcon && (
        <Ionicons
          name={leftIcon}
          size={22}
          color={theme.colors.textSecondary}
        />
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={20}
          color={theme.colors.textSecondary}
        />
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.container, { borderBottomColor: theme.colors.border }]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 2,
  },
});
