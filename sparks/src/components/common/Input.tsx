import React from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
  StyleProp,
} from "react-native";
import { theme , fonts } from "../../theme";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  /** Extra styling for the TextInput itself (e.g. room for a trailing icon). */
  inputStyle?: StyleProp<TextStyle>;
  /** Rendered inside the field, vertically centred after the text (e.g. an eye toggle). */
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  rightElement,
  ...props
}: InputProps) {
  const fieldColors = {
    backgroundColor: theme.colors.card,
    borderColor: error ? theme.colors.error : theme.colors.border,
  };

  const textInput = (
    <TextInput
      style={[
        styles.input,
        rightElement ? styles.inputInField : fieldColors,
        { color: theme.colors.textPrimary },
        inputStyle,
      ]}
      placeholderTextColor={theme.colors.textSecondary}
      {...props}
    />
  );

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      )}
      {rightElement ? (
        <View style={[styles.field, fieldColors]}>
          {textInput}
          {rightElement}
        </View>
      ) : (
        textInput
      )}
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
    minHeight: 48,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  inputInField: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: 46,
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
