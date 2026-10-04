import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface DividerProps {
  text?: string;
  orientation?: "horizontal" | "vertical";
}

export function Divider({ text, orientation = "horizontal" }: DividerProps) {
  const lineStyle = {
    backgroundColor: theme.colors.border,
    ...(orientation === "horizontal"
      ? { height: 1, flex: 1 }
      : { width: 1, flex: 1 }),
  };

  if (text) {
    return (
      <View
        style={
          orientation === "horizontal"
            ? styles.row
            : [styles.row, styles.column]
        }
      >
        <View style={lineStyle} />
        <Text
          style={[
            styles.text,
            { color: theme.colors.textSecondary },
            orientation === "horizontal" ? styles.textHorizontal : styles.textVertical,
          ]}
        >
          {text}
        </Text>
        <View style={lineStyle} />
      </View>
    );
  }

  return (
    <View
      style={[
        orientation === "horizontal" ? styles.dividerH : styles.dividerV,
        { backgroundColor: theme.colors.border },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  column: {
    flexDirection: "column",
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  textHorizontal: {},
  textVertical: {
    marginVertical: 8,
  },
  dividerH: {
    height: 1,
    width: "100%",
  },
  dividerV: {
    width: 1,
    alignSelf: "stretch",
  },
});
