import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COURSE_CATEGORIES } from "../../src/constants/mockData";
import { theme , fonts } from "../../src/theme";
import { useGetStudentPlaylistsQuery } from "../../src/store";
import type { PlaylistFromApi } from "../../src/types/playlist.types";
import { BannerAd } from "../../src/components/ads";

const { width: SCREEN_W } = Dimensions.get("window");
const FEATURED_W = SCREEN_W - 40;

// Extra words that count as a match for a category chip.
const CATEGORY_TERMS: Record<string, string[]> = {
  Mathematics: ["math", "maths", "mathematics", "algebra", "geometry"],
  English: ["english", "grammar", "vocabulary"],
  Science: ["science", "physics", "chemistry", "biology"],
  Coding: ["coding", "code", "programming", "python", "javascript", "java", "c++"],
  GK: ["gk", "general knowledge", "current affairs"],
  Motivation: ["motivation", "motivational", "mindset"],
};

export default function CourseScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const { data: playlistsRes, isFetching: isFetchingPlaylists } =
    useGetStudentPlaylistsQuery({
      page: 1,
      limit: 50,
      sortBy: "createdAt",
      order: "desc",
    });
  const playlists = playlistsRes?.data?.playlists ?? [];

  const filteredPlaylists = useMemo(() => {
    let list = playlists;
    // Playlists have no category field, so a chip filters by topic words in
    // the name/description (the chips used to change nothing).
    if (selectedCategory !== "All") {
      const terms = (CATEGORY_TERMS[selectedCategory] ?? [selectedCategory]).map((t) => t.toLowerCase());
      list = list.filter((p) => {
        const text = `${p.name} ${p.description ?? ""}`.toLowerCase();
        return terms.some((t) => text.includes(t));
      });
    }
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        (p.createdBy?.name ?? "").toLowerCase().includes(q)
    );
  }, [playlists, searchQuery, selectedCategory]);

  const totalEnrollments = useMemo(
    () =>
      playlists.reduce((s, p) => s + (p.enrollmentsCount ?? 0), 0),
    [playlists]
  );
  const totalEnrollmentsStr =
    totalEnrollments >= 1000
      ? (totalEnrollments / 1000).toFixed(1) + "K"
      : String(totalEnrollments);

  const featured = filteredPlaylists.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Courses</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Find the perfect course for you
          </Text>
        </View>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="filter-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search playlists..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredPlaylists}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        ListHeaderComponent={
          <>
            {/* STATS BANNER */}
            <LinearGradient
              colors={["#6C3CE1", "#A78BFA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statsBanner}
            >
              <View style={styles.statItem}>
                <Text style={styles.statNum}>
                  {isFetchingPlaylists ? "..." : playlists.length}
                </Text>
                <Text style={styles.statLabel}>Playlists</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{totalEnrollmentsStr}</Text>
                <Text style={styles.statLabel}>Enrolled</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{COURSE_CATEGORIES.length - 1}</Text>
                <Text style={styles.statLabel}>Categories</Text>
              </View>
              <View style={styles.statsDecor}>
                <Ionicons name="school" size={70} color="rgba(255,255,255,0.1)" />
              </View>
            </LinearGradient>

            {/* FEATURED PLAYLISTS */}
            {featured.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Featured
                  </Text>
                </View>
                <FlatList
                  data={featured}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={FEATURED_W + 12}
                  decelerationRate="fast"
                  contentContainerStyle={styles.featuredList}
                  keyExtractor={(item) => "feat-" + item._id}
                  renderItem={({ item }) => (
                    <FeaturedPlaylistCard
                      playlist={item}
                      onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: item._id } })}
                    />
                  )}
                />
              </>
            )}

            {/* BROWSE CATEGORIES */}
            <View style={[styles.sectionHeader, { marginTop: 18 }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Browse
              </Text>
              <Text style={[styles.resultCount, { color: theme.colors.textSecondary }]}>
                {filteredPlaylists.length} playlists
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catList}
            >
              {COURSE_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        { color: active ? theme.colors.buttonText : theme.colors.textPrimary },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => (
          <PlaylistCard
            playlist={item}
            onPress={() => router.push({ pathname: "/playlist/[id]", params: { id: item._id } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface }]}>
              <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              No playlists found
            </Text>
            <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
              {searchQuery ? "Try a different search" : "No playlists yet"}
            </Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.bannerAdWrap}>
            <BannerAd />
          </View>
        }
      />
    </View>
  );
}

/* =================== FEATURED PLAYLIST CARD =================== */

function FeaturedPlaylistCard({
  playlist,
  onPress,
}: {
  playlist: PlaylistFromApi;
  onPress: () => void;
}) {
  const videoCount = playlist.videoCount ?? 0;
  const enrollmentsCount = playlist.enrollmentsCount ?? 0;
  const averageRating = playlist.averageRating;
  const ratingCount = playlist.ratingCount ?? 0;
  const bannerUrl = playlist.banner?.url;

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.featCard}>
      <LinearGradient
        colors={["#0A4D9C", "#1EC8FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.featGradient}
      >
        {bannerUrl ? (
          <Image
            source={{ uri: bannerUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.featIconWrap}>
            <Ionicons name="library" size={60} color="rgba(255,255,255,0.15)" />
          </View>
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.35)" }]} />
        <View style={styles.featContent}>
          {playlist.createdBy && (
            <View style={styles.creatorRow}>
              {playlist.createdBy.avatar ? (
                <Image
                  source={{ uri: playlist.createdBy.avatar }}
                  style={styles.creatorAvatar}
                />
              ) : (
                <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                  <Text style={styles.creatorInitial}>
                    {(playlist.createdBy.name || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.creatorName} numberOfLines={1}>
                {playlist.createdBy.name}
              </Text>
            </View>
          )}
          <Text style={styles.featTitle} numberOfLines={2}>
            {playlist.name}
          </Text>
          {(playlist.description ?? "").length > 0 && (
            <Text style={styles.featMetaText} numberOfLines={2}>
              {playlist.description}
            </Text>
          )}
          <View style={styles.featMeta}>
            {averageRating != null && (
              <View style={styles.featMetaItem}>
                <Ionicons name="star" size={14} color="#FFB300" />
                <Text style={styles.featMetaText}>
                  {averageRating.toFixed(1)}
                  {ratingCount > 0 ? ` (${ratingCount})` : ""}
                </Text>
              </View>
            )}
            <View style={styles.featMetaItem}>
              <Ionicons name="videocam-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.featMetaText}>{videoCount} videos</Text>
            </View>
            <View style={styles.featMetaItem}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.featMetaText}>{enrollmentsCount} enrolled</Text>
            </View>
          </View>
          <View style={styles.featBtn}>
            <Text style={styles.featBtnText}>Explore</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/* =================== PLAYLIST CARD =================== */

function PlaylistCard({
  playlist,
  onPress,
}: {
  playlist: PlaylistFromApi;
  onPress: () => void;
}) {
  const videoCount = playlist.videoCount ?? 0;
  const enrollmentsCount = playlist.enrollmentsCount ?? 0;
  const averageRating = playlist.averageRating;
  const ratingCount = playlist.ratingCount ?? 0;
  const bannerUrl = playlist.banner?.url;

  return (
    <TouchableOpacity
      style={[styles.courseCard, { backgroundColor: theme.colors.card }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Thumb */}
      <View style={[styles.courseThumb, { backgroundColor: theme.colors.surface }]}>
        {bannerUrl ? (
          <Image
            source={{ uri: bannerUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="library" size={36} color={theme.colors.primary} />
        )}
        <View style={styles.coursePlayBadge}>
          <Ionicons name="play-circle" size={28} color="#FFF" />
        </View>
      </View>

      {/* Info */}
      <View style={styles.courseInfo}>
        <View style={styles.courseTitleRow}>
          <Text style={[styles.courseTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {playlist.name}
          </Text>
          {averageRating != null && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={14} color="#FFB300" />
              <Text style={[styles.ratingBadgeText, { color: theme.colors.textPrimary }]}>
                {averageRating.toFixed(1)}
                {ratingCount > 0 ? ` (${ratingCount})` : ""}
              </Text>
            </View>
          )}
        </View>
        {(playlist.description ?? "").length > 0 && (
          <Text style={[styles.courseStatText, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {playlist.description}
          </Text>
        )}

        {playlist.createdBy && (
          <View style={styles.creatorRow}>
            {playlist.createdBy.avatar ? (
              <Image
                source={{ uri: playlist.createdBy.avatar }}
                style={styles.creatorAvatar}
              />
            ) : (
              <View style={[styles.creatorAvatar, styles.creatorAvatarPlaceholder]}>
                <Text style={[styles.creatorInitial, { color: theme.colors.buttonText }]}>
                  {(playlist.createdBy.name || "?").charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.creatorName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {playlist.createdBy.name}
            </Text>
          </View>
        )}

        {/* Bottom stats */}
        <View style={styles.courseBottom}>
          <View style={styles.courseStatRow}>
            <View style={styles.courseStat}>
              <Ionicons name="videocam-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.courseStatText, { color: theme.colors.textSecondary }]}>
                {videoCount} videos
              </Text>
            </View>
            <View style={styles.courseStat}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.courseStatText, { color: theme.colors.textSecondary }]}>
                {enrollmentsCount} enrolled
              </Text>
            </View>
          </View>
          <View style={[styles.enrollBtn, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.enrollBtnText, { color: theme.colors.buttonText }]}>View</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.buttonText} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* =================== STYLES =================== */

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontFamily: fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, marginTop: 2 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  /* SEARCH */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 0,
  },

  listContent: { paddingHorizontal: 0 },

  /* STATS BANNER */
  statsBanner: {
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    overflow: "hidden",
    marginBottom: 20,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNum: { fontFamily: fonts.bold, fontSize: 24, color: "#FFF" },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  statDivider: { width: 1, height: 36, borderRadius: 1 },
  statsDecor: { position: "absolute", right: -10, bottom: -10 },

  /* SECTION */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 19 },
  seeAll: { fontFamily: fonts.semiBold, fontSize: 14 },
  resultCount: { fontFamily: fonts.regular, fontSize: 13 },

  /* FEATURED */
  featuredList: { paddingHorizontal: 20, gap: 12, marginBottom: 24 },
  featCard: { width: FEATURED_W },
  featGradient: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
    overflow: "hidden",
  },
  featIconWrap: { position: "absolute", right: -5, top: -5 },
  featBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featBadgeText: { fontFamily: fonts.semiBold, fontSize: 13, color: "#FFF" },
  featContent: { flex: 1, justifyContent: "flex-end" },
  featCatPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  featCatText: { fontFamily: fonts.medium, fontSize: 12, color: "#FFF" },
  featTitle: { fontFamily: fonts.bold, fontSize: 20, color: "#FFF", marginBottom: 8 },
  featMeta: { flexDirection: "row", gap: 16, marginBottom: 14 },
  featMetaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  featMetaText: { fontFamily: fonts.regular, fontSize: 12, color: "rgba(255,255,255,0.85)" },
  featBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  featBtnText: { fontFamily: fonts.semiBold, fontSize: 14, color: "#FFF" },

  /* Creator (by line) */
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  creatorAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  creatorInitial: { fontFamily: fonts.semiBold, fontSize: 12, color: "#FFF" },
  creatorName: { fontFamily: fonts.medium, fontSize: 13, color: "rgba(255,255,255,0.95)", flex: 1 },

  /* CATEGORY CHIPS */
  catList: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  catChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  catChipText: { fontFamily: fonts.medium, fontSize: 14 },

  /* PLAYLIST CHIPS */
  playlistList: { paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  playlistChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 90,
    maxWidth: 180,
  },
  playlistChipText: { fontFamily: fonts.medium, fontSize: 13 },
  playlistEmpty: { paddingVertical: 10, paddingHorizontal: 14 },
  playlistEmptyText: { fontFamily: fonts.regular, fontSize: 13 },

  /* COURSE CARD */
  courseCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  courseThumb: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  coursePlayBadge: {
    position: "absolute",
    alignSelf: "center",
  },
  courseDurBadge: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  courseDurText: { fontFamily: fonts.medium, fontSize: 11, color: "#FFF" },
  courseInfo: { padding: 16 },
  courseTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingBadgeText: { fontFamily: fonts.semiBold, fontSize: 13 },
  courseTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontFamily: fonts.semiBold, fontSize: 11 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontFamily: fonts.semiBold, fontSize: 14 },
  courseTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 17, lineHeight: 22 },

  /* INSTRUCTOR */
  instructorRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  instructorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  instructorInitial: { fontFamily: fonts.bold, fontSize: 12, color: theme.colors.buttonText },
  instructorName: { fontFamily: fonts.regular, fontSize: 13 },

  /* BOTTOM */
  courseBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  courseStatRow: { flexDirection: "row", gap: 14 },
  courseStat: { flexDirection: "row", alignItems: "center", gap: 5 },
  courseStatText: { fontFamily: fonts.regular, fontSize: 12 },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  enrollBtnText: { fontFamily: fonts.semiBold, fontSize: 13 },

  /* EMPTY */
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontFamily: fonts.semiBold, fontSize: 18, marginBottom: 8 },
  emptyDesc: { fontFamily: fonts.regular, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  bannerAdWrap: { alignItems: "center", paddingVertical: 20 },
});
