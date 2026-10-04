import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme , fonts } from "../../theme";

interface HeaderProps {
  title: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onLeftPress?: () => void;
  onRightPress?: () => void;
}

export function Header({
  title,
  leftIcon = "arrow-back",
  rightIcon,
  onLeftPress,
  onRightPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {onLeftPress ? (
          <TouchableOpacity onPress={onLeftPress} hitSlop={12}>
            <Ionicons
              name={leftIcon}
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text
          style={[styles.title, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {onRightPress && rightIcon ? (
          <TouchableOpacity onPress={onRightPress} hitSlop={12}>
            <Ionicons
              name={rightIcon}
              size={24}
              color={theme.colors.textPrimary}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  placeholder: {
    width: 24,
    height: 24,
  },
});
