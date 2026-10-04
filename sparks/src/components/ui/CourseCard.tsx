import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";
import type { Course } from "../../constants/mockData";

const THUMB_SIZE = 120;

interface CourseCardProps {
  course: Course;
  onPress?: () => void;
}

export function CourseCard({ course, onPress }: CourseCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.thumbnail, { backgroundColor: theme.colors.surface }]}>
        <Ionicons
          name="school"
          size={56}
          color={theme.colors.primary}
        />
        <View style={styles.lessonsBadge}>
          <Text style={styles.lessons}>{course.lessons} lessons</Text>
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
        <View style={styles.enrollRow}>
          <Text style={[styles.enrollText, { color: theme.colors.primary }]}>
            Enroll now
          </Text>
          <Ionicons name="arrow-forward" size={18} color={theme.colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    overflow: "hidden",
    padding: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  thumbnail: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonsBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  lessons: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#FFFFFF",
  },
  info: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  instructor: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 4,
  },
  enrollRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  enrollText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
});
