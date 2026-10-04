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
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { VideoThumb } from "../../../src/components/ui/VideoThumb";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { theme, fonts } from "../../../src/theme";
import {
  useGetPlaylistByIdQuery,
  useGetPlaylistCoursesQuery,
  useEnrollInPlaylistMutation,
  useGetCourseByIdQuery,
  useSubmitRatingMutation,
} from "../../../src/store";
import type { CourseFromApi } from "../../../src/types/playlist.types";
import { BannerAd, useRewardedAd } from "../../../src/components/ads";

const { width: SCREEN_W } = Dimensions.get("window");

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Video player modal: when user closes, we show rating ───
function CourseVideoModal({
  courseId,
  onClose,
  onRequestRating,
}: {
  courseId: string;
  onClose: () => void;
  onRequestRating: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { data } = useGetCourseByIdQuery(courseId, { skip: !courseId });
  const course = data?.data?.course;
  const videoUrl = course?.video?.url ?? "";

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });
  const isReady = status === "readyToPlay";

  useEffect(() => {
    if (videoUrl) player.play();
  }, [videoUrl]);

  const handleClose = () => {
    onRequestRating(courseId);
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[styles.modalTitle, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {course?.title ?? "Video"}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.modalCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.videoContainer}>
            {videoUrl ? (
              <>
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  nativeControls
                />
                {!isReady && (
                  <View style={styles.videoLoadingOverlay} pointerEvents="none">
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text
                      style={[
                        styles.videoLoadingText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      Loading...
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Ionicons
                  name="videocam-off-outline"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.videoPlaceholderText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
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

// ─── Rating modal: 1–5 stars, one per video ───
function RatingModal({
  courseId,
  courseTitle,
  onClose,
  onSubmit,
  submitting,
}: {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
  onSubmit: (rating: number) => void;
  submitting?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.ratingOverlay}>
        <View
          style={[
            styles.ratingBox,
            {
              paddingBottom: insets.bottom + 24,
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[styles.ratingTitle, { color: theme.colors.textPrimary }]}
          >
            Rate this video
          </Text>
          <Text
            style={[styles.ratingSubtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {courseTitle}
          </Text>
          <Text style={[styles.ratingHint, { color: theme.colors.textSecondary }]}>
            One rating per video (you can update later)
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setRating(s)}
                style={styles.starBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={s <= rating ? "star" : "star-outline"}
                  size={40}
                  color="#FFB300"
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.ratingActions}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.ratingBtn, { backgroundColor: theme.colors.surface }]}
            >
              <Text style={[styles.ratingBtnText, { color: theme.colors.textPrimary }]}>
                Skip
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (rating >= 1) onSubmit(rating);
                onClose();
              }}
              style={[styles.ratingBtn, { backgroundColor: theme.colors.primary }]}
              disabled={rating < 1 || submitting}
            >
              <Text
                style={[
                  styles.ratingBtnText,
                  { color: theme.colors.buttonText },
                ]}
              >
                {submitting ? "Submitting..." : "Submit"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PlaylistDetailScreen() {
  const { id: playlistId, videoId } = useLocalSearchParams<{
    id: string;
    videoId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [videoModalCourseId, setVideoModalCourseId] = useState<string | null>(
    null
  );
  // Keyed by videoId: this screen stays mounted, so a boolean only ever
  // auto-opened the first video tapped from Home.
  const autoOpenedVideoRef = useRef<string | null>(null);
  const [ratingModalCourse, setRatingModalCourse] = useState<{
    courseId: string;
    title: string;
  } | null>(null);

  const { data: playlistData, isLoading: loadingPlaylist } =
    useGetPlaylistByIdQuery(playlistId ?? "", { skip: !playlistId });
  const { data: coursesData, isLoading: loadingCourses, refetch: refetchCourses } =
    useGetPlaylistCoursesQuery(playlistId ?? "", { skip: !playlistId });
  const [enroll, { isLoading: enrolling }] = useEnrollInPlaylistMutation();
  const [submitRating, { isLoading: submittingRating }] = useSubmitRatingMutation();
  const { showRewardedAd } = useRewardedAd();

  const playlist = playlistData?.data?.playlist;
  const courses = useMemo(() => coursesData?.data?.courses ?? [], [coursesData]);
  const isEnrolled = playlist?.isEnrolled ?? false;

  // When opened from a "Popular Video" card on home, auto-play that video once.
  // Only when enrolled: otherwise the API answers 403 and the student just
  // sees the locked list (enroll first).
  useEffect(() => {
    if (!videoId || autoOpenedVideoRef.current === videoId || courses.length === 0) return;
    if (!isEnrolled) return;
    const match = courses.find((c) => c._id === videoId);
    if (match) {
      autoOpenedVideoRef.current = videoId;
      // One-shot reaction to a navigation param, guarded by autoOpenedVideoRef.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      setVideoModalCourseId(match._id);
    }
  }, [videoId, courses, isEnrolled]);

  const handleEnroll = async () => {
    if (!playlistId) return;
    const earned = await showRewardedAd();
    if (!earned) {
      Alert.alert(
        "Ad required",
        "Please watch the full ad to enroll in this course.",
        [{ text: "OK" }]
      );
      return;
    }
    enroll({ playlistId, adWatched: true });
  };

  const handleOpenVideo = async (course: CourseFromApi) => {
    await showRewardedAd();
    setVideoModalCourseId(course._id);
  };

  const handleVideoClosedRequestRating = (id: string) => {
    setVideoModalCourseId(null);
    // Interstitial removed from video-close so screen isn’t blocked and flow stays smooth
    const course = courses.find((c) => c._id === id);
    if (!course) return;
    // Student can give only one rating per video – check before opening rating modal
    if (course.myRating != null && course.myRating >= 1) {
      Alert.alert(
        "Already rated",
        `You already rated this video ${course.myRating}/5.`,
        [{ text: "OK" }]
      );
      return;
    }
    setRatingModalCourse({ courseId: course._id, title: course.title });
  };

  const handleSubmitRating = async (rating: number) => {
    if (ratingModalCourse) {
      try {
        await submitRating({ courseId: ratingModalCourse.courseId, rating }).unwrap();
        refetchCourses();
      } finally {
        setRatingModalCourse(null);
      }
    }
  };

  if (!playlistId) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          Invalid playlist
        </Text>
      </View>
    );
  }

  if (loadingPlaylist && !playlist) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!playlist) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          Playlist not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.primary }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bannerUrl = playlist.banner?.url;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
        >
          {playlist.name}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={[styles.bannerWrap, { backgroundColor: theme.colors.surface }]}>
          {bannerUrl ? (
            <Image
              source={{ uri: bannerUrl }}
              style={styles.bannerImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.bannerPlaceholder}>
              <Ionicons name="library" size={64} color={theme.colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={[styles.playlistName, { color: theme.colors.textPrimary }]}>
            {playlist.name}
          </Text>
          {(playlist.description ?? "").length > 0 && (
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
            >
              {playlist.description}
            </Text>
          )}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="videocam-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {playlist.videoCount ?? 0} videos
              </Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="people-outline" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {playlist.enrollmentsCount ?? 0} enrolled
              </Text>
            </View>
          </View>

          {!isEnrolled && (
            <TouchableOpacity
              onPress={handleEnroll}
              disabled={enrolling}
              style={[styles.enrollBtn, { backgroundColor: theme.colors.primary }]}
            >
              {enrolling ? (
                <ActivityIndicator size="small" color={theme.colors.buttonText} />
              ) : (
                <>
                  <Text style={[styles.enrollBtnText, { color: theme.colors.buttonText }]}>
                    Enroll
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={theme.colors.buttonText} />
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Videos list - disabled until enrolled (one enrollment per playlist) */}
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Videos
          </Text>
          {!isEnrolled && (
            <View style={[styles.enrollPrompt, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Ionicons name="lock-closed" size={22} color={theme.colors.textSecondary} />
              <Text style={[styles.enrollPromptText, { color: theme.colors.textSecondary }]}>
                Enroll to watch videos
              </Text>
            </View>
          )}
          {loadingCourses ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : courses.length === 0 ? (
            <Text style={[styles.emptyVideos, { color: theme.colors.textSecondary }]}>
              No videos in this playlist yet.
            </Text>
          ) : (
            courses.map((course) => (
              <TouchableOpacity
                key={course._id}
                style={[
                  styles.videoRow,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    opacity: isEnrolled ? 1 : 0.6,
                  },
                ]}
                activeOpacity={isEnrolled ? 0.85 : 1}
                onPress={() => isEnrolled && handleOpenVideo(course)}
                disabled={!isEnrolled}
              >
                <View style={[styles.videoThumb, { backgroundColor: theme.colors.surface }]}>
                  <VideoThumb
                    thumbnailUrl={course.thumbnail?.url}
                    videoUrl={course.video?.url}
                    iconName="videocam-outline"
                  />
                  {!isEnrolled && (
                    <View style={styles.videoLockOverlay}>
                      <Ionicons name="lock-closed" size={24} color="#FFF" />
                    </View>
                  )}
                </View>
                <View style={styles.videoInfo}>
                  <Text
                    style={[styles.videoTitle, { color: theme.colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {course.title}
                  </Text>
                  <Text
                    style={[styles.videoDuration, { color: theme.colors.textSecondary }]}
                  >
                    {formatDuration(course.duration ?? 0)}
                  </Text>
                  {course.myRating != null && course.myRating >= 1 && (
                    <View style={styles.myRatingRow}>
                      <Ionicons name="star" size={14} color="#FFB300" />
                      <Text style={[styles.myRatingText, { color: theme.colors.textSecondary }]}>
                        You rated: {course.myRating}/5
                      </Text>
                    </View>
                  )}
                </View>
                {isEnrolled ? (
                  <Ionicons name="play-circle" size={36} color={theme.colors.primary} />
                ) : (
                  <Ionicons name="lock-closed" size={24} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>
            ))
          )}
          <View style={styles.bannerAdWrap}>
            <BannerAd />
          </View>
        </View>
      </ScrollView>

      {videoModalCourseId ? (
        <CourseVideoModal
          courseId={videoModalCourseId}
          onClose={() => setVideoModalCourseId(null)}
          onRequestRating={handleVideoClosedRequestRating}
        />
      ) : null}

      {ratingModalCourse ? (
        <RatingModal
          courseId={ratingModalCourse.courseId}
          courseTitle={ratingModalCourse.title}
          onClose={() => setRatingModalCourse(null)}
          onSubmit={handleSubmitRating}
          submitting={submittingRating}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontFamily: fonts.regular, fontSize: 16, marginBottom: 12 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontFamily: fonts.semiBold, fontSize: 18 },

  scroll: { flex: 1 },
  bannerWrap: {
    width: SCREEN_W,
    height: 180,
  },
  bannerImg: { width: "100%", height: "100%" },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 20 },
  playlistName: { fontFamily: fonts.bold, fontSize: 22, marginBottom: 8 },
  description: { fontFamily: fonts.regular, fontSize: 14, marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 20, marginBottom: 16 },
  stat: { flexDirection: "row", alignItems: "center", gap: 6 },
  statText: { fontFamily: fonts.regular, fontSize: 14 },
  enrollBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 24,
  },
  enrollBtnText: { fontFamily: fonts.semiBold, fontSize: 16 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, marginBottom: 14 },
  bannerAdWrap: { alignItems: "center", paddingVertical: 20 },
  enrollPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  enrollPromptText: { fontFamily: fonts.medium, fontSize: 14 },
  emptyVideos: { fontFamily: fonts.regular, fontSize: 14 },
  videoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  videoThumb: {
    width: 100,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  videoLockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoInfo: { flex: 1 },
  videoTitle: { fontFamily: fonts.semiBold, fontSize: 15 },
  videoDuration: { fontFamily: fonts.regular, fontSize: 12, marginTop: 2 },
  myRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  myRatingText: { fontFamily: fonts.regular, fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
  },
  modalContent: { marginHorizontal: 12, borderRadius: 12, overflow: "hidden" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: { flex: 1, fontFamily: fonts.semiBold, fontSize: 16 },
  modalCloseBtn: { padding: 4 },
  videoContainer: { height: 220, backgroundColor: "#000", borderRadius: 8 },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  videoLoadingText: { fontFamily: fonts.regular, fontSize: 14, marginTop: 8 },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: { fontFamily: fonts.regular, fontSize: 14 },

  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  ratingBox: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingTop: 20,
    borderWidth: 1,
  },
  ratingTitle: { fontFamily: fonts.bold, fontSize: 20, textAlign: "center" },
  ratingSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  ratingHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  starBtn: { padding: 4 },
  ratingActions: { flexDirection: "row", gap: 12 },
  ratingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  ratingBtnText: { fontFamily: fonts.semiBold, fontSize: 16 },
});
