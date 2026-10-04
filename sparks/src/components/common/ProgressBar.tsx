import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface ProgressBarProps {
  progress: number;
  max?: number;
  showLabel?: boolean;
  height?: number;
}

export function ProgressBar({
  progress,
  max = 100,
  showLabel = false,
  height = 8,
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (progress / max) * 100));

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${percentage}%`,
              backgroundColor: theme.colors.primary,
            },
          ]}
        />
      </View>
      {showLabel && (
        <Text
          style={[styles.label, { color: theme.colors.textSecondary }]}
        >
          {Math.round(percentage)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  track: {
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
  },
});
