import React from "react";
import { View, StyleSheet, ScrollView, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

interface ScreenWrapperProps {
  children: React.ReactNode;
  scroll?: boolean;
  padding?: number;
  style?: ViewStyle;
}

export function ScreenWrapper({
  children,
  scroll = true,
  padding = 16,
  style,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();

  const containerStyle = {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingHorizontal: padding,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[styles.scroll, style]}
        contentContainerStyle={containerStyle}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.container, containerStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
