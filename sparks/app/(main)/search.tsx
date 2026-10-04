import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoThumb } from "../../src/components/ui/VideoThumb";
import { theme , fonts } from "../../src/theme";

import { useLazyGetSearchQuery } from "../../src/store";
import type {
  SearchTeacherItem,
  SearchPlaylistItem,
  HomeReelItem,
  HomeLongVideoItem,
} from "../../src/types/home.types";

const { width: SCREEN_W } = Dimensions.get("window");
const REEL_CARD_W = 110;
const VIDEO_CARD_W = 160;
const COURSE_CARD_W = 180;
const TEACHER_AVATAR_SIZE = 52;
const DEBOUNCE_MS = 400;

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [triggerSearch, { data, isFetching, isUninitialized }] = useLazyGetSearchQuery();

  const searchQuery = query.trim();
  const hasSearched = !isUninitialized;
  const isEmpty = searchQuery.length === 0;
  const showResults = hasSearched && !isEmpty;

  useEffect(() => {
    if (!searchQuery) return;
    const t = setTimeout(() => {
      triggerSearch({ q: searchQuery, limit: 10 });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery, triggerSearch]);

  const teachers = data?.data?.teachers ?? [];
  const reels = data?.data?.reels ?? [];
  const courses = data?.data?.courses ?? [];
  const playlists = data?.data?.playlists ?? [];
  const totalCount = teachers.length + reels.length + courses.length + playlists.length;
  const noResults = showResults && !isFetching && totalCount === 0;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />

      {/* Header + Search input */}
      <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={[styles.searchInputWrap, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Teachers, videos, reels, playlists..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isFetching && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Searching...</Text>
        </View>
      )}

      {noResults && (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={56} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No results</Text>
          <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
            Try different keywords for teachers, reels, courses or playlists
          </Text>
        </View>
      )}

      {showResults && !isFetching && totalCount > 0 && (
        <FlatList
          data={[
            { type: "section" as const, id: "teachers", title: "Teachers", count: teachers.length },
            ...teachers.map((t) => ({ type: "teacher" as const, id: t._id, item: t })),
            { type: "section" as const, id: "reels", title: "Reels", count: reels.length },
            ...reels.map((r) => ({ type: "reel" as const, id: r._id, item: r })),
            { type: "section" as const, id: "courses", title: "Courses", count: courses.length },
            ...courses.map((c) => ({ type: "course" as const, id: c._id, item: c })),
            { type: "section" as const, id: "playlists", title: "Playlists", count: playlists.length },
            ...playlists.map((p) => ({ type: "playlist" as const, id: p._id, item: p })),
          ]}
          keyExtractor={(row) => (row.type === "section" ? row.id : (row as { id: string }).id)}
          renderItem={({ item: row }) => {
            if (row.type === "section") {
              if (row.count === 0) return null;
              return (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{row.title}</Text>
                </View>
              );
            }
            if (row.type === "teacher") {
              const t = row.item as SearchTeacherItem;
              return (
                <TouchableOpacity
                  style={[styles.teacherRow, { backgroundColor: theme.colors.card }]}
                  onPress={() => router.push(`/teacher/${t._id}` as const)}
                  activeOpacity={0.8}
                >
                  {t.avatar ? (
                    <Image source={{ uri: t.avatar }} style={styles.teacherAvatar} />
                  ) : (
                    <View style={[styles.teacherAvatarPlaceholder, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.teacherAvatarText, { color: theme.colors.primary }]}>
                        {(t.name || "T").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.teacherInfo}>
                    <Text style={[styles.teacherName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text style={[styles.teacherEmail, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {t.email}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            }
            if (row.type === "reel") {
              const r = row.item as HomeReelItem;
              const thumbUrl = r.thumbnail?.url ?? null;
              return (
                <TouchableOpacity
                  style={styles.reelRow}
                  onPress={() => router.push({ pathname: "/reel", params: { reelId: r._id } })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.reelThumb, { backgroundColor: theme.colors.surface }]}>
                    <VideoThumb thumbnailUrl={thumbUrl} videoUrl={r.video?.url} iconSize={24} />
                    <View style={styles.reelDuration}>
                      <Text style={styles.reelDurText}>{formatDuration(r.duration ?? 0)}</Text>
                    </View>
                  </View>
                  <View style={styles.reelInfo}>
                    <Text style={[styles.reelTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                      {r.title}
                    </Text>
                    <Text style={[styles.reelMeta, { color: theme.colors.textSecondary }]}>
                      {r.createdBy?.name ?? "—"} · {formatViews(r.views ?? 0)} views
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (row.type === "course") {
              const c = row.item as HomeLongVideoItem;
              const thumbUrl = c.thumbnail?.url ?? null;
              return (
                <TouchableOpacity
                  style={styles.courseRow}
                  onPress={() =>
                    c.playlist?._id && router.push({ pathname: "/playlist/[id]", params: { id: c.playlist._id } } as const)
                  }
                  activeOpacity={0.8}
                >
                  <View style={[styles.courseThumb, { backgroundColor: theme.colors.surface }]}>
                    <VideoThumb
                      thumbnailUrl={thumbUrl}
                      videoUrl={c.video?.url}
                      iconName="play-circle"
                      iconSize={36}
                    />
                    <View style={styles.vDuration}>
                      <Text style={styles.vDurText}>{formatDuration(c.duration ?? 0)}</Text>
                    </View>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={[styles.courseTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <Text style={[styles.courseMeta, { color: theme.colors.textSecondary }]}>
                      {c.playlist?.name ?? "—"} · {c.createdBy?.name ?? "—"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (row.type === "playlist") {
              const p = row.item as SearchPlaylistItem;
              const thumbUrl = p.banner?.url ?? null;
              return (
                <TouchableOpacity
                  style={[styles.playlistRow, { backgroundColor: theme.colors.card }]}
                  onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: p._id } } as const)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.playlistThumb, { backgroundColor: theme.colors.surface }]}>
                    {thumbUrl ? (
                      <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <Ionicons name="list" size={28} color={theme.colors.primary} />
                    )}
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text style={[styles.playlistName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={[styles.playlistMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                      {p.createdBy?.name ?? "—"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              );
            }
            return null;
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            !isEmpty && !isFetching && totalCount > 0 ? (
              <Text style={[styles.resultHint, { color: theme.colors.textSecondary }]}>
                {totalCount} result{totalCount !== 1 ? "s" : ""}
              </Text>
            ) : null
          }
        />
      )}

      {!showResults && !isFetching && (
        <View style={styles.hintWrap}>
          <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.hintTitle, { color: theme.colors.textPrimary }]}>Search</Text>
          <Text style={[styles.hintSub, { color: theme.colors.textSecondary }]}>
            Find teachers, reels, courses and playlists
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  searchInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    paddingVertical: 4,
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: { fontFamily: fonts.regular, fontSize: 14 },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, marginTop: 16 },
  emptySub: { fontFamily: fonts.regular, fontSize: 14, marginTop: 8, textAlign: "center" },
  hintWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  hintTitle: { fontFamily: fonts.bold, fontSize: 20, marginTop: 16 },
  hintSub: { fontFamily: fonts.regular, fontSize: 15, marginTop: 8, textAlign: "center" },
  resultHint: { fontFamily: fonts.regular, fontSize: 13, marginBottom: 12 },
  sectionHeader: { marginTop: 16, marginBottom: 10 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 17 },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  teacherAvatar: { width: TEACHER_AVATAR_SIZE, height: TEACHER_AVATAR_SIZE, borderRadius: TEACHER_AVATAR_SIZE / 2 },
  teacherAvatarPlaceholder: {
    width: TEACHER_AVATAR_SIZE,
    height: TEACHER_AVATAR_SIZE,
    borderRadius: TEACHER_AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherAvatarText: { fontFamily: fonts.bold, fontSize: 20 },
  teacherInfo: { flex: 1 },
  teacherName: { fontFamily: fonts.semiBold, fontSize: 15 },
  teacherEmail: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  reelRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  reelThumb: {
    width: REEL_CARD_W,
    aspectRatio: 9 / 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  reelDuration: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reelDurText: { fontFamily: fonts.medium, fontSize: 10, color: "#FFF" },
  reelInfo: { flex: 1, justifyContent: "center" },
  reelTitle: { fontFamily: fonts.semiBold, fontSize: 14 },
  reelMeta: { fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  courseRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 12,
  },
  courseThumb: {
    width: VIDEO_CARD_W,
    aspectRatio: 16 / 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  vDuration: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vDurText: { fontFamily: fonts.medium, fontSize: 11, color: "#FFF" },
  courseInfo: { flex: 1, justifyContent: "center" },
  courseTitle: { fontFamily: fonts.semiBold, fontSize: 14 },
  courseMeta: { fontFamily: fonts.regular, fontSize: 12, marginTop: 4 },
  playlistRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  playlistThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  playlistInfo: { flex: 1 },
  playlistName: { fontFamily: fonts.semiBold, fontSize: 15 },
  playlistMeta: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
});
