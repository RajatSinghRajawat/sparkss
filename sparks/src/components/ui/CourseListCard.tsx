import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";
import type { Course } from "../../constants/mockData";

interface CourseListCardProps {
  course: Course;
  onPress?: () => void;
}

export function CourseListCard({ course, onPress }: CourseListCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.videoThumb, { backgroundColor: theme.colors.surface }]}>
        <Ionicons
          name="play-circle"
          size={56}
          color={theme.colors.primary}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.duration}>{course.introVideoDuration}</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.category}>{course.category}</Text>
        </View>
      </View>
      <View style={styles.info}>
        <Text
          style={[styles.title, { color: theme.colors.textPrimary }]}
          numberOfLines={2}
        >
          {course.title}
        </Text>
        <Text
          style={[styles.instructor, { color: theme.colors.textSecondary }]}
        >
          {course.instructor}
        </Text>
        <View style={styles.footer}>
          <View style={styles.lessonsRow}>
            <Ionicons
              name="library-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.lessons, { color: theme.colors.textSecondary }]}>
              {course.lessons} lessons
            </Text>
          </View>
          <View style={styles.enrollRow}>
            <Text style={[styles.enrollText, { color: theme.colors.primary }]}>
              Enroll now
            </Text>
            <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  videoThumb: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  duration: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#FFFFFF",
  },
  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  category: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#FFFFFF",
  },
  info: {
    padding: 16,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  instructor: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 6,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  lessonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lessons: {
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  enrollRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  enrollText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
