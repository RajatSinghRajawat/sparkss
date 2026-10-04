import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { theme , fonts } from "../../theme";

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: number;
}

export function Avatar({ source, name, size = 48 }: AvatarProps) {
  const initials = name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (source) {
    return (
      <Image
        source={source}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { color: "#FFFFFF", fontSize: size * 0.4 },
        ]}
      >
        {initials ?? "?"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {},
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: fonts.semiBold,
  },
});
