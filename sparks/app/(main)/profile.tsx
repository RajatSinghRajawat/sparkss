import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useIsFocused, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoThumb } from "../../src/components/ui/VideoThumb";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme , fonts } from "../../src/theme";

import {
  useGetProfileQuery,
  useGetSavedReelsQuery,
  useToggleReelSaveMutation,
  useAppDispatch,
  logout,
  clearAuthStorage,
} from "../../src/store";
import type { ReelFromApi } from "../../src/types/reel.types";
import { BannerAd } from "../../src/components/ads";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_H_PAD = 20;
const GRID_GAP = 12;
const GRID_COLS = 2;
const GRID_CARD_W = (SCREEN_W - GRID_H_PAD * 2 - GRID_GAP) / GRID_COLS;
const SAVED_PAGE_SIZE = 12;

type ProfileTab = "overview" | "saved";

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number): string {
  const total = Math.floor(seconds ?? 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MENU_SECTIONS = [
  {
    title: "Account",
    items: [
      { icon: "person-outline" as const, label: "Edit Profile", color: "#0A4D9C" },
      { icon: "lock-closed-outline" as const, label: "Change Password", color: "#6C3CE1" },
      { icon: "people-outline" as const, label: "Following Teachers", color: "#1EC8FF" },
    ],
  },

  {
    title: "Support",
    items: [
      { icon: "help-circle-outline" as const, label: "Help Center", color: "#FFB300" },
      { icon: "information-circle-outline" as const, label: "About", color: "#6C3CE1" },
    ],
  },

  {
    title: "Danger zone",
    items: [
      { icon: "trash-outline" as const, label: "Delete Account", color: "#E53935" },
    ],
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [savedPage, setSavedPage] = useState(1);
  const [savedReels, setSavedReels] = useState<ReelFromApi[]>([]);
  // Reels un-saved from the grid: hidden right away instead of waiting for the refetch.
  const [removedReelIds, setRemovedReelIds] = useState<Set<string>>(new Set());
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetProfileQuery(undefined, {
    refetchOnFocus: true,
  });

  const {
    data: savedData,
    isFetching: isSavedFetching,
    isError: isSavedError,
    refetch: refetchSaved,
  } = useGetSavedReelsQuery(
    { page: savedPage, limit: SAVED_PAGE_SIZE },
    { refetchOnFocus: true }
  );

  const [toggleReelSave] = useToggleReelSaveMutation();

  // Saves/unsaves made in the reel feed only change page 1, and a refetch only
  // reloads the current page — so coming back here past page 1 missed them.
  // Restart the grid from page 1 whenever the tab is shown again.
  const isScreenFocused = useIsFocused();
  const wasFocusedRef = useRef(isScreenFocused);
  useEffect(() => {
    if (isScreenFocused && !wasFocusedRef.current) {
      if (savedPage === 1) refetchSaved();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset paging on refocus
      else setSavedPage(1);
    }
    wasFocusedRef.current = isScreenFocused;
  }, [isScreenFocused, savedPage, refetchSaved]);

  const savedPagination = savedData?.data?.pagination;
  const savedTotal = savedPagination?.total ?? 0;
  const savedHasMore = savedPagination?.hasMore ?? false;

  useEffect(() => {
    const list = savedData?.data?.reels;
    if (!list) return;
    const fetchedPage = savedData?.data?.pagination?.page ?? 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulates paged saved reels.
    setSavedReels((prev) => {
      if (fetchedPage === 1) return list;
      const existingIds = new Set(prev.map((r) => r._id));
      const fresh = list.filter((r) => !existingIds.has(r._id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh];
    });
    // A fresh first page is authoritative, so local removals can be dropped.
    if (fetchedPage === 1) setRemovedReelIds(new Set());
  }, [savedData]);

  const visibleSavedReels = savedReels.filter((r) => !removedReelIds.has(r._id));

  const handleUnsave = useCallback(
    async (reelId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setUnsavingId(reelId);
      setRemovedReelIds((prev) => new Set(prev).add(reelId));
      try {
        const res = await toggleReelSave(reelId).unwrap();
        // Re-saved (double toggle / stale state) — put the card back.
        if (res?.data?.saved) {
          setRemovedReelIds((prev) => {
            const next = new Set(prev);
            next.delete(reelId);
            return next;
          });
        }
      } catch (_) {
        setRemovedReelIds((prev) => {
          const next = new Set(prev);
          next.delete(reelId);
          return next;
        });
      } finally {
        setUnsavingId(null);
      }
    },
    [toggleReelSave]
  );

  const loadMoreSaved = useCallback(() => {
    if (!savedHasMore || isSavedFetching) return;
    setSavedPage((p) => p + 1);
  }, [savedHasMore, isSavedFetching]);

  const profile = data?.data;
  const displayName = profile?.name ?? "Student";
  const displayEmail = profile?.email ?? "";
  const initials = displayName
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "S";

  const handleLogout = async () => {
    await clearAuthStorage();
    dispatch(logout());
    router.replace("/(auth)/login");
  };

  if (isLoading && !profile) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  if (isError && !profile) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Failed to load profile
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
          <Text style={[styles.retryBtnText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stats = [
    { value: String(profile?.enrolledCourseCount ?? 0), label: "Courses" },
    { value: `${profile?.avgTestScore ?? 0}%`, label: "Avg Score" },
    { value: String(profile?.completedTestCount ?? 0), label: "Tests" },
    { value: formatCount(savedTotal), label: "Saved" },
  ];

  const tabs: { key: ProfileTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "overview", label: "Overview", icon: "person-circle-outline" },
    { key: "saved", label: "Saved Reels", icon: "bookmark" },
  ];

  const handleRefreshAll = () => {
    refetch();
    if (savedPage === 1) refetchSaved();
    else setSavedPage(1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* HEADER CARD */}
        <LinearGradient
          colors={["#0A4D9C", "#1EC8FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={styles.profileDecor}>
            <Ionicons name="school" size={120} color="rgba(255,255,255,0.07)" />
          </View>

          <View style={styles.profileTop}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity style={styles.settingsBtn} onPress={handleRefreshAll}>
              <Ionicons name="refresh-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarRow}>
            {profile?.image ? (
              <Image
                source={{ uri: profile.image }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{displayEmail}</Text>
              <View style={styles.profileBadge}>
                <Ionicons name="star" size={12} color="#FFB300" />
                <Text style={styles.profileBadgeText}>Pro Learner</Text>
              </View>
            </View>
          </View>

          {/* Stats row from API */}
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />}
                <View style={styles.statItem}>
                  <Text style={styles.statNum}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </LinearGradient>

        {/* TABS */}
        <View style={styles.tabRowOuter}>
          <View style={[styles.tabRow, { backgroundColor: theme.colors.card }]}>
            {tabs.map(({ key, label, icon }) => {
              const isActive = activeTab === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.tab,
                    { backgroundColor: isActive ? theme.colors.primary + "18" : "transparent" },
                  ]}
                  onPress={() => setActiveTab(key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={icon}
                    size={18}
                    color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                  {key === "saved" && savedTotal > 0 ? (
                    <View
                      style={[
                        styles.tabBadge,
                        { backgroundColor: isActive ? theme.colors.primary : theme.colors.textSecondary },
                      ]}
                    >
                      <Text style={styles.tabBadgeText}>{formatCount(savedTotal)}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {activeTab === "overview" ? (
          <>
            {/* MENU SECTIONS */}
            {MENU_SECTIONS.map((section) => (
              <View key={section.title} style={styles.menuSection}>
                <Text style={[styles.menuSectionTitle, { color: theme.colors.textSecondary }]}>
                  {section.title}
                </Text>
                <View style={[styles.menuCard, { backgroundColor: theme.colors.card }]}>
                  {section.items.map((item, idx) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[
                        styles.menuItem,
                        idx < section.items.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={
                        item.label === "Edit Profile"
                          ? () => router.push("/edit-profile")
                          : item.label === "Change Password"
                            ? () => router.push("/change-password")
                            : item.label === "Following Teachers"
                              ? () => router.push("/following")
                              : item.label === "Help Center"
                                ? () => router.push("/help-center")
                                : item.label === "Delete Account"
                                  ? () => router.push("/delete-account")
                                  : undefined
                      }
                    >
                      <View style={[styles.menuIcon, { backgroundColor: item.color + "15" }]}>
                        <Ionicons name={item.icon} size={20} color={item.color} />
                      </View>
                      <Text style={[styles.menuLabel, { color: theme.colors.textPrimary }]}>
                        {item.label}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* TEACHER'S APP CARD */}
            <View style={styles.teacherSection}>
              <LinearGradient
                colors={["#FF6B35", "#FFB300"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.teacherCard}
              >
                <View style={styles.teacherDecor}>
                  <Ionicons name="easel" size={100} color="rgba(255,255,255,0.1)" />
                </View>

                <View style={styles.teacherBadge}>
                  <Ionicons name="sparkles" size={14} color="#FFF" />
                  <Text style={styles.teacherBadgeText}>For Educators</Text>
                </View>

                <Text style={styles.teacherTitle}>Become a Teacher</Text>
                <Text style={styles.teacherDesc}>
                  Create your own account on the Sparks Teacher&apos;s App and start sharing your knowledge with thousands of students.
                </Text>

                <View style={styles.teacherFeatures}>
                  <View style={styles.teacherFeature}>
                    <View style={styles.teacherFeatureIcon}>
                      <Ionicons name="videocam" size={16} color="#FFF" />
                    </View>
                    <Text style={styles.teacherFeatureText}>Upload Videos & Courses</Text>
                  </View>
                  <View style={styles.teacherFeature}>
                    <View style={styles.teacherFeatureIcon}>
                      <Ionicons name="film" size={16} color="#FFF" />
                    </View>
                    <Text style={styles.teacherFeatureText}>Create Short Reels</Text>
                  </View>
                  <View style={styles.teacherFeature}>
                    <View style={styles.teacherFeatureIcon}>
                      <Ionicons name="clipboard" size={16} color="#FFF" />
                    </View>
                    <Text style={styles.teacherFeatureText}>Design Quizzes & Tests</Text>
                  </View>
                  <View style={styles.teacherFeature}>
                    <View style={styles.teacherFeatureIcon}>
                      <Ionicons name="analytics" size={16} color="#FFF" />
                    </View>
                    <Text style={styles.teacherFeatureText}>Track Student Progress</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.teacherBtn}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL("https://teacher.eduspark.com")}
                >
                  <Ionicons name="open-outline" size={18} color="#FF6B35" />
                  <Text style={styles.teacherBtnText}>Open Teacher&apos;s App</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FF6B35" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* LOGOUT */}
            <TouchableOpacity
              style={[styles.logoutBtn, { backgroundColor: theme.colors.error + "12" }]}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <View style={[styles.logoutIconWrap, { backgroundColor: theme.colors.error + "20" }]}>
                <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
              </View>
              <Text style={[styles.logoutText, { color: theme.colors.error }]}>Log Out</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.error} />
            </TouchableOpacity>

            <View style={styles.bannerAdWrap}>
              <BannerAd />
            </View>
            {/* VERSION */}
            <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
              Sparks v1.0.0
            </Text>
          </>
        ) : (
          /* ─── SAVED REELS TAB ─── */
          <View style={styles.savedSection}>
            {visibleSavedReels.length === 0 && isSavedFetching ? (
              <View style={styles.savedLoading}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                  Loading saved reels...
                </Text>
              </View>
            ) : visibleSavedReels.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.background }]}>
                  <Ionicons
                    name={isSavedError ? "cloud-offline-outline" : "bookmark-outline"}
                    size={44}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  {isSavedError ? "Couldn't load saved reels" : "No saved reels yet"}
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                  {isSavedError
                    ? "Check your connection and try again."
                    : "Tap the bookmark icon on any reel to save it here for later."}
                </Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: theme.colors.primary }]}
                  activeOpacity={0.85}
                  onPress={() => (isSavedError ? refetchSaved() : router.push("/reel"))}
                >
                  <Ionicons
                    name={isSavedError ? "refresh" : "play-circle"}
                    size={18}
                    color="#FFF"
                  />
                  <Text style={styles.emptyActionText}>
                    {isSavedError ? "Retry" : "Browse Reels"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.savedGrid}>
                  {visibleSavedReels.map((reel) => (
                    <TouchableOpacity
                      key={reel._id}
                      style={[styles.savedCard, { backgroundColor: theme.colors.card }]}
                      activeOpacity={0.88}
                      onPress={() =>
                        router.push({
                          pathname: "/saved-reels",
                          params: { reelId: reel._id },
                        })
                      }
                    >
                      <View style={styles.savedThumbWrap}>
                        <VideoThumb
                          thumbnailUrl={reel.thumbnail?.url}
                          videoUrl={reel.video?.url}
                          style={[styles.savedThumb, styles.savedThumbPlaceholder]}
                          iconName="videocam-outline"
                          iconSize={32}
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.65)"]}
                          style={styles.savedThumbGradient}
                        />
                        <View style={styles.savedPlayIcon}>
                          <Ionicons name="play" size={20} color="#FFF" />
                        </View>

                        {/* Unsave */}
                        <TouchableOpacity
                          style={styles.savedBookmarkBtn}
                          activeOpacity={0.8}
                          hitSlop={8}
                          disabled={unsavingId === reel._id}
                          onPress={() => handleUnsave(reel._id)}
                        >
                          {unsavingId === reel._id ? (
                            <ActivityIndicator size="small" color="#FFB300" />
                          ) : (
                            <Ionicons name="bookmark" size={16} color="#FFB300" />
                          )}
                        </TouchableOpacity>

                        {reel.duration ? (
                          <View style={styles.savedDurationBadge}>
                            <Text style={styles.savedDurationText}>
                              {formatDuration(reel.duration)}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.savedStatsBadge}>
                          <Ionicons name="eye-outline" size={10} color="#FFF" />
                          <Text style={styles.savedStatsText}>
                            {formatCount(reel.totalViews ?? reel.views ?? 0)}
                          </Text>
                          <Ionicons
                            name="heart"
                            size={10}
                            color="#FFF"
                            style={{ marginLeft: 6 }}
                          />
                          <Text style={styles.savedStatsText}>
                            {formatCount(reel.totalLikes ?? reel.likes ?? 0)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.savedCardBody}>
                        <Text
                          style={[styles.savedCardTitle, { color: theme.colors.textPrimary }]}
                          numberOfLines={2}
                        >
                          {reel.title}
                        </Text>
                        <View style={styles.savedCardAuthorRow}>
                          <Ionicons
                            name="person-circle-outline"
                            size={14}
                            color={theme.colors.textSecondary}
                          />
                          <Text
                            style={[styles.savedCardAuthor, { color: theme.colors.textSecondary }]}
                            numberOfLines={1}
                          >
                            {reel.createdBy?.name ?? "Creator"}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>

                {savedHasMore ? (
                  <TouchableOpacity
                    onPress={loadMoreSaved}
                    disabled={isSavedFetching}
                    style={[styles.loadMoreBtn, { backgroundColor: theme.colors.card }]}
                    activeOpacity={0.8}
                  >
                    {isSavedFetching ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                        Load more saved reels
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}

                <View style={styles.bannerAdWrap}>
                  <BannerAd />
                </View>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  retryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },

  /* PROFILE CARD */
  profileCard: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    marginBottom: 20,
  },
  profileDecor: {
    position: "absolute",
    right: -20,
    top: -20,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: "#FFF",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* AVATAR */
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFB300",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: "#081B33",
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: "#FFF",
  },
  profileEmail: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  profileBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
  },
  profileBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#FFF",
  },

  /* STATS */
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 16,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNum: { fontFamily: fonts.bold, fontSize: 20, color: "#FFF" },
  statLabel: { fontFamily: fonts.regular, fontSize: 11, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  statDivider: { width: 1, height: 30, borderRadius: 1 },

  /* TABS */
  tabRowOuter: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 5,
    gap: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  tabText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  tabBadge: {
    minWidth: 20,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: "#FFF",
  },

  /* MENU */
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  menuSectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 16,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 15,
  },

  /* SAVED REELS */
  savedSection: {
    paddingHorizontal: GRID_H_PAD,
  },
  savedLoading: {
    paddingVertical: 60,
    alignItems: "center",
  },
  savedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  savedCard: {
    width: GRID_CARD_W,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  savedThumbWrap: {
    width: "100%",
    height: GRID_CARD_W * 1.3,
    position: "relative",
  },
  savedThumb: {
    width: "100%",
    height: "100%",
  },
  savedThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(120,120,120,0.15)",
  },
  savedThumbGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
  },
  savedPlayIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -18,
    marginLeft: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedBookmarkBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  savedDurationBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  savedDurationText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: "#FFF",
  },
  savedStatsBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  savedStatsText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: "#FFF",
  },
  savedCardBody: {
    padding: 10,
    gap: 6,
  },
  savedCardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 18,
  },
  savedCardAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  savedCardAuthor: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
  },

  /* EMPTY / LOAD MORE */
  emptyCard: {
    borderRadius: 20,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 17,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  emptyActionText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#FFF",
  },
  loadMoreBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  loadMoreText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },

  /* TEACHER CARD */
  teacherSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  teacherCard: {
    borderRadius: 20,
    padding: 24,
    overflow: "hidden",
  },
  teacherDecor: {
    position: "absolute",
    right: -15,
    top: -15,
  },
  teacherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 14,
  },
  teacherBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#FFF",
  },
  teacherTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: "#FFF",
    marginBottom: 8,
  },
  teacherDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
    marginBottom: 18,
  },
  teacherFeatures: {
    gap: 12,
    marginBottom: 20,
  },
  teacherFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teacherFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  teacherFeatureText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: "#FFF",
  },
  teacherBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 14,
  },
  teacherBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: "#FF6B35",
  },

  /* LOGOUT */
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 14,
    marginBottom: 16,
  },
  logoutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },

  /* VERSION */
  bannerAdWrap: { alignItems: "center", marginVertical: 16 },
  version: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 20,
  },
});
