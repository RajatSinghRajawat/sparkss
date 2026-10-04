import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { theme } from "../../theme";

interface ContainerProps {
  children: React.ReactNode;
  padding?: number;
  maxWidth?: number;
  centered?: boolean;
  style?: ViewStyle;
}

export function Container({
  children,
  padding = 16,
  maxWidth,
  centered = false,
  style,
}: ContainerProps) {
  return (
    <View
      style={[
        styles.container,
        {
          padding,
          maxWidth,
          alignSelf: centered ? "center" : "stretch",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
