import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../src/theme";
import { useGetFollowingListQuery } from "../../src/store";
import { useRewardedAd } from "../../src/components/ads";
import { EmptyState } from "../../src/components/common/EmptyState";
import type { FollowingTeacher } from "../../src/types/reel.types";

function TeacherRow({
  teacher,
  onPress,
}: {
  teacher: FollowingTeacher;
  onPress: () => void;
}) {
  const initials = teacher.name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {teacher.avatar ? (
        <Image source={{ uri: teacher.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={[styles.avatarText, { color: theme.colors.textSecondary }]}>
            {initials || "T"}
          </Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[styles.rowName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {teacher.name}
        </Text>
        {teacher.email ? (
          <Text style={[styles.rowEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {teacher.email}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
        style={{ opacity: 0.6 }}
      />
    </TouchableOpacity>
  );
}

export default function FollowingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showRewardedAd } = useRewardedAd();

  useFocusEffect(
    useCallback(() => {
      const run = async () => {
        await showRewardedAd();
        await showRewardedAd();
      };
      run();
    }, [showRewardedAd])
  );

  const { data, isLoading, isError, refetch } = useGetFollowingListQuery(
    { page: 1, limit: 50 },
    { refetchOnFocus: true }
  );

  const teachers = data?.data?.teachers ?? [];
  const pagination = data?.data?.pagination;

  const handleTeacherPress = (teacherId: string) => {
    router.push(`/teacher/${teacherId}` as const);
  };

  if (isLoading && teachers.length === 0) {
    return (
      <View
        style={[
          styles.screen,
          styles.centered,
          { paddingTop: insets.top, backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (isError && teachers.length === 0) {
    return (
      <View
        style={[
          styles.screen,
          styles.centered,
          { paddingTop: insets.top, backgroundColor: theme.colors.background },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Failed to load list
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top, backgroundColor: theme.colors.background },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Following Teachers
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {teachers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No teachers yet"
          message="When you follow teachers from reels or their profile, they’ll appear here."
        />
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TeacherRow
              teacher={item}
              onPress={() => handleTeacherPress(item._id)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            pagination && pagination.total > 0 ? (
              <Text style={[styles.countText, { color: theme.colors.textSecondary }]}>
                {pagination.total} teacher{pagination.total !== 1 ? "s" : ""} followed
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 12,
  },
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  countText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    overflow: "hidden",
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  rowEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 2,
  },
});
