import React from "react";
import { View, TextInput, StyleSheet, TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface SearchInputProps extends Omit<TextInputProps, "style"> {
  containerStyle?: object;
}

export function SearchInput({
  containerStyle,
  ...props
}: SearchInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons
        name="search"
        size={20}
        color={theme.colors.textSecondary}
        style={styles.icon}
      />
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.card,
            color: theme.colors.textPrimary,
            borderColor: theme.colors.border,
          },
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        placeholder="Search..."
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    marginBottom: 16,
  },
  icon: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    textAlignVertical: "center",
    lineHeight: 48,
    zIndex: 1,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 44,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
});
