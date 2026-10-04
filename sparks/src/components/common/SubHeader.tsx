import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface SubHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SubHeader({ title, subtitle, action }: SubHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 2,
  },
  action: {},
});
