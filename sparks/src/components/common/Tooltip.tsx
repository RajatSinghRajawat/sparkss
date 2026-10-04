import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <View style={styles.container}>
      {children}
      <View
        style={[
          styles.tooltip,
          {
            backgroundColor: theme.colors.textPrimary,
            borderColor: theme.colors.textPrimary,
          },
        ]}
      >
        <Text style={styles.tooltipText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tooltipText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#FFFFFF",
  },
});
