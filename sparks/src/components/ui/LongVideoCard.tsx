import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";
import type { LongVideo } from "../../constants/mockData";


interface LongVideoCardProps {
  video: LongVideo;
  onPress?: () => void;
}

export function LongVideoCard({ video, onPress }: LongVideoCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.thumbnail, { backgroundColor: theme.colors.surface }]}>
        <Ionicons
          name="play-circle"
          size={48}
          color={theme.colors.primary}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.duration}>{video.duration}</Text>
        </View>
      </View>
      <Text
        style={[styles.title, { color: theme.colors.textPrimary }]}
        numberOfLines={2}
      >
        {video.title}
      </Text>
      <Text
        style={[styles.views, { color: theme.colors.textSecondary }]}
      >
        {video.views}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  duration: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#FFFFFF",
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  views: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
});
