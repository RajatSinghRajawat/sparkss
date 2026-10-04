import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

interface RatingProps {
  value: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: number;
  readonly?: boolean;
}

export function Rating({
  value,
  max = 5,
  onChange,
  size = 24,
  readonly = false,
}: RatingProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;

        return (
          <TouchableOpacity
            key={i}
            onPress={() => !readonly && onChange?.(i + 1)}
            disabled={readonly}
            activeOpacity={0.7}
            style={styles.star}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={theme.colors.accent}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  star: {
    padding: 2,
  },
});
