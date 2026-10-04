import React from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ViewProps,
} from "react-native";
import { theme } from "../../theme";

interface CardProps extends ViewProps {
  children: React.ReactNode;
  onPress?: () => void;
  padding?: number;
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  padding = 16,
  style,
  ...props
}: CardProps) {
  const content = (
    <View style={[styles.content, { padding }]}>{children}</View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.card,
          { backgroundColor: theme.colors.card },
          style,
        ]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.card }, style]}
      {...props}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  content: {},
});
