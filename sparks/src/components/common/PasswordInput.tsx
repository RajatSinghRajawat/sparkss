import React, { useState } from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";
import { Input } from "./Input";
import type { InputProps } from "./Input";

interface PasswordInputProps extends Omit<InputProps, "secureTextEntry" | "rightElement"> {}

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      secureTextEntry={!visible}
      rightElement={
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setVisible((v) => !v)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={visible ? "Hide password" : "Show password"}
        >
          <Ionicons
            name={visible ? "eye-off-outline" : "eye-outline"}
            size={22}
            color={theme.colors.textSecondary}
          />
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  eyeButton: {
    width: 48,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
});
