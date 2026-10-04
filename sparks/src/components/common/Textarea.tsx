import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from "react-native";
import { theme , fonts } from "../../theme";

interface TextareaProps extends Omit<TextInputProps, "style" | "multiline"> {
  label?: string;
  error?: string;
  rows?: number;
  containerStyle?: ViewStyle;
}

export function Textarea({
  label,
  error,
  rows = 4,
  containerStyle,
  ...props
}: TextareaProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            color: theme.colors.textPrimary,
            borderColor: error ? theme.colors.error : theme.colors.border,
            minHeight: rows * 24,
          },
        ]}
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        textAlignVertical="top"
        {...props}
      />
      {error && (
        <Text style={[styles.error, { color: theme.colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
