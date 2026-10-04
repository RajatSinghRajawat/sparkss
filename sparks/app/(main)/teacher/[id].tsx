import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import type {
  TeacherProfileReel,
  TeacherProfileCourse,
  TeacherProfileVideo,
} from "../../../src/types/reel.types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoThumb } from "../../../src/components/ui/VideoThumb";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { theme, fonts } from "../../../src/theme";
import {
  useGetTeacherProfileQuery,
  useGetFollowStatusQuery,
  useToggleFollowMutation,
} from "../../../src/store";
import { BannerAd, useRewardedAd } from "../../../src/components/ads";

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 16;
const REEL_CARD_GAP = 12;
const COLS = 2;
const CARD_W = (SCREEN_W - H_PAD * 2 - REEL_CARD_GAP) / COLS;

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function formatDuration(seconds: number): string {
  const m = Math.floor((seconds ?? 0) / 60);
  const s = Math.floor((seconds ?? 0) % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ReelVideoModal({
  reel,
  onClose,
}: {
  reel: TeacherProfileReel;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const videoUrl = reel.video?.url ?? "";
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const isReady = status === "readyToPlay";

  useEffect(() => {
    if (videoUrl) player.play();
  }, [videoUrl]);

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {reel.title}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: theme.colors.card }]} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.videoContainer}>
            {videoUrl ? (
              <>
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  nativeControls={true}
                />
                {!isReady && (
                  <View style={styles.videoLoadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.videoLoadingText, { color: theme.colors.textSecondary }]}>
                      Loading...
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-off-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.videoPlaceholderText, { color: theme.colors.textSecondary }]}>
                  No video
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function LongVideoModal({
  video,
  onClose,
}: {
  video: TeacherProfileVideo;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const videoUrl = video.video?.url ?? "";
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const isReady = status === "readyToPlay";

  useEffect(() => {
    if (videoUrl) player.play();
  }, [videoUrl]);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {video.title}
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.modalCloseBtn, { backgroundColor: theme.colors.card }]} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.videoContainer}>
            {videoUrl ? (
              <>
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  nativeControls={true}
                />
                {!isReady && (
                  <View style={styles.videoLoadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={[styles.videoLoadingText, { color: theme.colors.textSecondary }]}>
                      Loading...
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons name="videocam-off-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.videoPlaceholderText, { color: theme.colors.textSecondary }]}>
                  No video
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function TeacherProfileScreen() {
  const { id: teacherId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const limit = 5;
  const [selectedReel, setSelectedReel] = useState<TeacherProfileReel | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<TeacherProfileVideo | null>(null);
  const [activeTab, setActiveTab] = useState<"reels" | "courses" | "videos">("reels");
  const { showRewardedAd } = useRewardedAd();

  const handleOpenReel = async (reel: TeacherProfileReel) => {
    await showRewardedAd();
    setSelectedReel(reel);
  };
  const handleOpenVideo = async (video: TeacherProfileVideo) => {
    await showRewardedAd();
    setSelectedVideo(video);
  };

  const { data, isLoading, isFetching, isError, refetch } = useGetTeacherProfileQuery(
    { teacherId: teacherId ?? "", page, limit },
    { skip: !teacherId }
  );

  const { data: followData } = useGetFollowStatusQuery(teacherId ?? "", {
    skip: !teacherId,
  });
  const [toggleFollow, { isLoading: isTogglingFollow }] = useToggleFollowMutation();

  const serverFollowing = followData?.data?.following;
  const [localFollowing, setLocalFollowing] = useState(false);
  const [syncedServerFollowing, setSyncedServerFollowing] = useState<boolean | undefined>(
    undefined
  );
  // Adopt the server value during render (React's "adjust state on prop change"
  // pattern) so an optimistic toggle is never overwritten by a stale refetch.
  if (serverFollowing !== undefined && serverFollowing !== syncedServerFollowing) {
    setSyncedServerFollowing(serverFollowing);
    setLocalFollowing(serverFollowing);
  }
  const followState = localFollowing;

  const handleFollowPress = async () => {
    if (!teacherId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocalFollowing((prev) => !prev);
    try {
      const res = await toggleFollow(teacherId).unwrap();
      if (res?.data) setLocalFollowing(res.data.following);
    } catch {
      setLocalFollowing((prev) => !prev);
    }
  };

  const teacher = data?.data?.teacher;
  const reelsFromApi = useMemo(() => data?.data?.reels ?? [], [data]);
  const coursesFromApi = useMemo(() => data?.data?.courses ?? [], [data]);
  const videosFromApi = useMemo(() => data?.data?.videos ?? [], [data]);
  const pagination = data?.data?.pagination;
  const hasMore = pagination?.hasMore ?? false;

  const [reelsList, setReelsList] = useState<typeof reelsFromApi>([]);
  const [lastFetchedPage, setLastFetchedPage] = useState(0);
  const [listTeacherId, setListTeacherId] = useState(teacherId);
  // Navigating straight from one teacher to another reuses this component, so
  // drop the previous teacher's accumulated reels before the new page arrives.
  if (teacherId !== listTeacherId) {
    setListTeacherId(teacherId);
    setPage(1);
    setReelsList([]);
    setLastFetchedPage(0);
  }
  useEffect(() => {
    const fetchedPage = pagination?.page ?? 1;
    if (fetchedPage === 1) {
      // Accumulates paged reels; reelsFromApi is memoized, so re-setting an
      // unchanged page is a no-op rather than a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      setReelsList(reelsFromApi);
      setLastFetchedPage(1);
    } else if (fetchedPage === page && fetchedPage > lastFetchedPage) {
      setReelsList((prev) => [...prev, ...reelsFromApi]);
      setLastFetchedPage(fetchedPage);
    }
  }, [reelsFromApi, pagination?.page, page, lastFetchedPage]);

  if (!teacherId) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          Invalid teacher
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading && !teacher) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (isError || !teacher) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
          Failed to load teacher
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initial = teacher.name?.charAt(0)?.toUpperCase() ?? "T";

  const loadMore = () => {
    // isFetching, not isLoading: isLoading is only true for the first page, so a
    // double tap jumped from page 1 to 3 and page 2's reels never appeared.
    if (hasMore && !isFetching) setPage((p) => p + 1);
  };

  const tabs = [
    { key: "reels" as const, label: "Reels", icon: "play-circle" as const },
    { key: "courses" as const, label: "Courses", icon: "book" as const },
    { key: "videos" as const, label: "Videos", icon: "film" as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header: safe area only on header, no extra top padding */}
      <View style={[styles.header, { paddingTop: insets.top || 0, paddingBottom: 12, backgroundColor: theme.colors.background, borderBottomWidth: 0, shadowColor: theme.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={12}>
          <View style={[styles.headerBackInner, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          Profile
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Teacher hero card - refined gradient & shadow */}
        <View style={styles.teacherCardWrap}>
          <LinearGradient
            colors={["#0A4D9C", "#1282C9", "#1EC8FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.teacherCard}
          >
            <View style={styles.teacherDecor}>
              <Ionicons name="school" size={140} color="rgba(255,255,255,0.06)" />
            </View>
            <View style={styles.teacherAvatarRow}>
              <View style={styles.avatarRing}>
                {teacher.avatar ? (
                  <Image source={{ uri: teacher.avatar }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{initial}</Text>
                  </View>
                )}
              </View>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{teacher.name}</Text>
                <View style={styles.followersRow}>
                  <View style={styles.followersBadge}>
                    <Ionicons name="people" size={14} color="rgba(255,255,255,0.95)" />
                    <Text style={styles.followersText}>
                      {formatCount(teacher.followersCount)} followers
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.followBtn, followState && styles.followBtnActive]}
                  onPress={handleFollowPress}
                  disabled={isTogglingFollow}
                  activeOpacity={0.85}
                >
                  {isTogglingFollow ? (
                    <ActivityIndicator size="small" color={followState ? theme.colors.primary : "#FFF"} />
                  ) : (
                    <>
                      <Ionicons
                        name={followState ? "checkmark-circle" : "person-add-outline"}
                        size={18}
                        color={followState ? theme.colors.primary : "#FFF"}
                      />
                      <Text
                        style={[
                          styles.followBtnText,
                          followState && styles.followBtnTextActive,
                        ]}
                      >
                        {followState ? "Following" : "Follow"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Segmented tabs with icons */}
        <View style={[styles.tabRowWrap, { backgroundColor: theme.colors.card }]}>
          {tabs.map(({ key, label, icon }) => {
            const isActive = activeTab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.tab,
                  isActive && styles.tabActive,
                  { backgroundColor: isActive ? theme.colors.primary + "18" : "transparent" },
                ]}
                onPress={() => setActiveTab(key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={icon}
                  size={18}
                  color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? theme.colors.primary : theme.colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab content */}
        <View style={styles.section}>
          {activeTab === "reels" && (
            <>
              {reelsList.length === 0 && !isLoading ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="play-circle-outline" size={44} color={theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No reels yet</Text>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Short videos will appear here when this teacher posts
                  </Text>
                </View>
              ) : (
                <View style={styles.reelGrid}>
                  {reelsList.map((reel) => (
                    <View key={reel._id} style={styles.reelCardWrap}>
                      <TouchableOpacity activeOpacity={0.88} onPress={() => handleOpenReel(reel)}>
                        <View style={[styles.reelCard, { backgroundColor: theme.colors.card }]}>
                          <View style={styles.reelThumbWrap}>
                            <VideoThumb
                              thumbnailUrl={reel.thumbnail?.url}
                              videoUrl={reel.video?.url}
                              style={[styles.reelThumb, styles.reelThumbPlaceholder]}
                              iconName="videocam-outline"
                              iconSize={32}
                            />
                            <LinearGradient
                              colors={["transparent", "rgba(0,0,0,0.6)"]}
                              style={styles.reelThumbGradient}
                            />
                            <View style={styles.reelPlayIcon}>
                              <Ionicons name="play" size={22} color="#FFF" />
                            </View>
                            <View style={styles.reelCardStatsBadge}>
                              <Ionicons name="eye-outline" size={10} color="#FFF" />
                              <Text style={styles.reelCardStatsText}>{formatCount(reel.views ?? 0)}</Text>
                              <Ionicons name="heart-outline" size={10} color="#FFF" style={{ marginLeft: 6 }} />
                              <Text style={styles.reelCardStatsText}>{formatCount(reel.likes ?? 0)}</Text>
                            </View>
                          </View>
                          <Text style={[styles.reelCardTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                            {reel.title}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              {selectedReel ? (
                <ReelVideoModal reel={selectedReel} onClose={() => setSelectedReel(null)} />
              ) : null}
              {hasMore && (
                <TouchableOpacity
                  onPress={loadMore}
                  disabled={isFetching}
                  style={[styles.loadMoreBtn, { backgroundColor: theme.colors.surface }]}
                  activeOpacity={0.8}
                >
                  {isFetching ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: theme.colors.primary }]}>
                      Load more reels
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </>
          )}

          {activeTab === "courses" && (
            <>
              {coursesFromApi.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="book-outline" size={44} color={theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No courses yet</Text>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Course content will show here when available
                  </Text>
                </View>
              ) : (
                <View style={styles.mediaList}>
                  {coursesFromApi.map((course) => (
                    <TouchableOpacity
                      key={course._id}
                      style={[styles.mediaCard, { backgroundColor: theme.colors.card }]}
                      onPress={() =>
                        course.playlist?._id &&
                        router.push({ pathname: "/playlist/[id]", params: { id: course.playlist._id } })
                      }
                      activeOpacity={0.82}
                    >
                      <View style={styles.mediaThumbWrap}>
                        <VideoThumb
                          thumbnailUrl={course.thumbnail?.url}
                          videoUrl={course.video?.url}
                          style={[styles.mediaThumb, styles.mediaThumbPlaceholder]}
                          iconName="book-outline"
                          iconSize={36}
                        />
                        <View style={styles.mediaPlayIcon}>
                          <Ionicons name="play" size={22} color="#FFF" />
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationBadgeText}>{formatDuration(course.duration ?? 0)}</Text>
                        </View>
                      </View>
                      <View style={styles.mediaInfo}>
                        <Text style={[styles.mediaTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                          {course.title}
                        </Text>
                        {course.playlist?.name ? (
                          <Text style={[styles.mediaMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                            {course.playlist.name}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === "videos" && (
            <>
              {videosFromApi.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
                  <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surface }]}>
                    <Ionicons name="film-outline" size={44} color={theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>No videos yet</Text>
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    Long-form videos will appear here
                  </Text>
                </View>
              ) : (
                <View style={styles.mediaList}>
                  {videosFromApi.map((video) => (
                    <TouchableOpacity
                      key={video._id}
                      style={[styles.mediaCard, { backgroundColor: theme.colors.card }]}
                      onPress={() => handleOpenVideo(video)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.mediaThumbWrap}>
                        <VideoThumb
                          thumbnailUrl={video.thumbnail?.url}
                          videoUrl={video.video?.url}
                          style={[styles.mediaThumb, styles.mediaThumbPlaceholder]}
                          iconName="film-outline"
                          iconSize={36}
                        />
                        <View style={styles.mediaPlayIcon}>
                          <Ionicons name="play" size={22} color="#FFF" />
                        </View>
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationBadgeText}>{formatDuration(video.duration ?? 0)}</Text>
                        </View>
                      </View>
                      <View style={styles.mediaInfo}>
                        <Text style={[styles.mediaTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                          {video.title}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} style={{ opacity: 0.6 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedVideo ? (
                <LongVideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} />
              ) : null}
            </>
          )}
          <View style={styles.bannerAdWrap}>
            <BannerAd />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  bannerAdWrap: { alignItems: "center", paddingVertical: 20 },
  errorText: { fontFamily: fonts.medium, fontSize: 16, marginTop: 12 },
  backBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { fontFamily: fonts.semiBold, fontSize: 16 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  headerBack: { padding: 4 },
  headerBackInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontFamily: fonts.semiBold, fontSize: 18, flex: 1, textAlign: "center" },
  headerRight: { width: 40 },

  teacherCardWrap: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  teacherCard: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
  },
  teacherDecor: {
    position: "absolute",
    right: -30,
    top: -30,
  },
  teacherAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 42,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: "#FFF",
  },
  teacherInfo: { flex: 1, minWidth: 0 },
  teacherName: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: "#FFF",
    letterSpacing: 0.3,
  },
  followersRow: { marginTop: 8 },
  followersBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  followersText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
    alignSelf: "flex-start",
  },
  followBtnActive: {
    backgroundColor: "#FFF",
    borderColor: "#FFF",
  },
  followBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#FFF",
  },
  followBtnTextActive: {
    color: theme.colors.primary,
  },

  tabRowWrap: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 4,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  tabActive: {},
  tabText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },

  section: { paddingHorizontal: 16, paddingTop: 4 },
  mediaList: {
    gap: 14,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    overflow: "hidden",
    paddingRight: 14,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mediaThumbWrap: {
    position: "relative",
    width: 128,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  mediaThumb: {
    width: 128,
    height: 72,
    backgroundColor: theme.colors.surface,
  },
  mediaThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  mediaPlayIcon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  durationBadge: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationBadgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#FFF",
  },
  mediaInfo: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  mediaTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
  },
  mediaMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 3,
  },
  emptyCard: {
    borderRadius: 20,
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    marginBottom: 6,
    textAlign: "center",
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 24,
  },

  reelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  reelCardWrap: { width: CARD_W },
  reelCard: {
    overflow: "hidden",
    borderRadius: 16,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  reelThumbWrap: {
    position: "relative",
    width: "100%",
  },
  reelThumb: {
    width: "100%",
    height: CARD_W * 1.25,
    backgroundColor: theme.colors.surface,
  },
  reelThumbGradient: {
    ...StyleSheet.absoluteFill,
  },
  reelThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  reelPlayIcon: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  reelCardStatsBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reelCardStatsText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#FFF",
  },
  reelCardTitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    lineHeight: 18,
  },
  loadMoreBtn: {
    marginTop: 20,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreText: { fontFamily: fonts.semiBold, fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 17,
    marginRight: 12,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  videoContainer: {
    flex: 1,
    minHeight: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPlaceholder: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginTop: 8,
  },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoLoadingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginTop: 12,
  },
});
