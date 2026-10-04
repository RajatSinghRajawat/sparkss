import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image } from "expo-image";
import { fonts } from "../../theme";
import type { ReelFromApi } from "../../types/reel.types";

const { width: SCREEN_W } = Dimensions.get("window");

/** UI shape of a reel, mapped from the API response. */
export interface Reel {
  id: string;
  title: string;
  description: string;
  duration: string;
  views: string;
  likes: string;
  likesCount: number;
  comments: string;
  author: string;
  authorInitial: string;
  teacherId: string | null;
  teacherFollowersCount: number;
  category: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  raw?: ReelFromApi;
}

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

export function mapReelFromApi(r: ReelFromApi): Reel {
  const name = r.createdBy?.name ?? "Creator";
  const initial = name.charAt(0).toUpperCase();
  const durationSec = r.duration ?? 0;
  const durationStr =
    durationSec >= 60
      ? `${Math.floor(durationSec / 60)}:${String(Math.floor(durationSec % 60)).padStart(2, "0")}`
      : `0:${String(Math.floor(durationSec)).padStart(2, "0")}`;
  const likesCount = r.totalLikes ?? r.likes ?? 0;
  return {
    id: r._id,
    title: r.title,
    description: r.description ?? "",
    duration: durationStr,
    views: formatCount(r.totalViews ?? r.views ?? 0),
    likes: formatCount(likesCount),
    likesCount,
    comments: "0",
    author: name,
    authorInitial: initial,
    teacherId: r.createdBy?._id ?? null,
    teacherFollowersCount: r.teacherFollowersCount ?? 0,
    category: r.category?.name ?? "General",
    videoUrl: r.video?.url ?? null,
    thumbnailUrl: r.thumbnail?.url ?? null,
    raw: r,
  };
}

export interface ReelPlayerItemProps {
  reel: Reel;
  /** Attach the video source only when the reel is near the viewport. */
  shouldLoad: boolean;
  isActive: boolean;
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  isFollowing: boolean;
  onLike: () => void;
  onSave: () => void;
  onFollow?: () => void;
  onTeacherPress?: () => void;
  onShare: () => void;
  onVideoPlayStart?: (reelId: string) => void;
  height: number;
  bottomInset: number;
}

export function ReelPlayerItem({
  reel,
  shouldLoad,
  isActive,
  isLiked,
  isSaved,
  likesCount,
  isFollowing,
  onLike,
  onSave,
  onFollow,
  onTeacherPress,
  onShare,
  onVideoPlayStart,
  height,
  bottomInset,
}: ReelPlayerItemProps) {
  const [likeScale] = useState(() => new Animated.Value(1));
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoAnim] = useState(() => new Animated.Value(0));
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFiredPlayStartRef = useRef(false);
  const DOUBLE_TAP_DELAY = 300;

  const videoUrl = reel.videoUrl ?? "";
  // Start with no source; the source is attached only when this reel is near
  // the viewport (see effect below). This caps the number of concurrently
  // buffering native players to ~4 (prev + current + next 2).
  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.25;
  });
  // Compare by S3 object path, not full URL: every refetch re-signs the URL,
  // and swapping the source on that restarted the reel being watched.
  const videoPath = videoUrl.split("?")[0];
  const loadedPathRef = useRef<string | null>(null);
  const retriedUrlRef = useRef<string | null>(null);
  // Poster stays up until a frame is actually drawn — "readyToPlay" fires
  // before that, which showed a black flash.
  const [hasFirstFrame, setHasFirstFrame] = useState(false);

  // Attach / detach the video source based on proximity to the active reel.
  useEffect(() => {
    if (shouldLoad && videoUrl) {
      if (loadedPathRef.current !== videoPath) {
        loadedPathRef.current = videoPath;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- new source needs the poster again
        setHasFirstFrame(false);
        player.replaceAsync(videoUrl).catch(() => {});
      }
    } else if (!shouldLoad && loadedPathRef.current !== null) {
      loadedPathRef.current = null;
      setHasFirstFrame(false);
      player.replaceAsync(null).catch(() => {});
    }
  }, [shouldLoad, videoUrl, videoPath, player]);

  const { status } = useEvent(player, "statusChange", { status: player.status });

  // A failed load (typically an expired signed URL) used to spin forever.
  // Retry once with the current URL — after a refetch it's freshly signed.
  useEffect(() => {
    if (status !== "error" || !shouldLoad || !videoUrl) return;
    if (retriedUrlRef.current === videoUrl) return;
    retriedUrlRef.current = videoUrl;
    player.replaceAsync(videoUrl).catch(() => {});
  }, [status, shouldLoad, videoUrl, player]);
  const timeUpdate = useEvent(player, "timeUpdate", {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: -1,
  });

  const isReady = status === "readyToPlay";
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!isReady) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clears the cached native-player duration
      setDuration(0);
      return;
    }

    setDuration(player.duration ?? 0);
  }, [isReady, player, videoUrl]);
  const progress = duration > 0 ? Math.min(1, timeUpdate.currentTime / duration) : 0;

  useEffect(() => {
    if (!videoUrl) return;
    if (isActive && isReady) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, videoUrl, isReady, player]);

  useEffect(() => {
    if (!isActive || !isReady || !videoUrl || hasFiredPlayStartRef.current || !onVideoPlayStart) return;
    const t = setTimeout(() => {
      hasFiredPlayStartRef.current = true;
      onVideoPlayStart(reel.id);
    }, 400);
    return () => clearTimeout(t);
  }, [isActive, isReady, videoUrl, reel.id, onVideoPlayStart]);

  const toggleInfo = () => {
    const toValue = infoVisible ? 0 : 1;
    setInfoVisible(!infoVisible);
    Animated.timing(infoAnim, {
      toValue,
      duration: 280,
      useNativeDriver: true,
    }).start();
  };

  const infoTranslateY = infoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  // Heart button toggles; double-tap only ever likes (it used to unlike an
  // already-liked reel).
  const animateLike = (likeOnly = false) => {
    if (!(likeOnly && isLiked)) onLike();
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.4, useNativeDriver: true, speed: 50 }),
      Animated.spring(likeScale, { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  };

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      animateLike(true);
      return;
    }
    lastTapRef.current = now;
    singleTapTimeoutRef.current = setTimeout(() => {
      toggleInfo();
      singleTapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY);
  };

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  return (
    <TouchableOpacity
      style={[styles.reelItem, { height }]}
      activeOpacity={1}
      onPress={handlePress}
    >
      {/* Background */}
      <LinearGradient
        colors={["#0A0E21", "#081B33", "#0A1628"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Video (auto-play when active) or placeholder */}
      <View style={styles.playArea}>
        {reel.videoUrl ? (
          <>
            <VideoView
              player={player}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              nativeControls={false}
              onFirstFrameRender={() => setHasFirstFrame(true)}
            />
            {/* Thumbnail poster shown until the first frame is drawn — avoids black flash */}
            {!(isReady && hasFirstFrame) && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                {reel.thumbnailUrl ? (
                  <Image
                    source={{ uri: reel.thumbnailUrl, cacheKey: reel.thumbnailUrl.split("?")[0] }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <View style={styles.skeletonShimmer} />
                )}
              </View>
            )}
            {/* Spinner only on the active reel while it is still buffering */}
            {isActive && !isReady && (
              <ActivityIndicator
                size="large"
                color="#FFB300"
                style={styles.skeletonSpinner}
                pointerEvents="none"
              />
            )}
          </>
        ) : (
          <View style={styles.playCircle}>
            <Ionicons name="play" size={44} color="rgba(255,255,255,0.9)" />
          </View>
        )}
      </View>

      {/* Thin yellow progress bar — kitni reel play hui */}
      {reel.videoUrl ? (
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      ) : null}

      {/* Right action bar */}
      <View style={[styles.actionsBar, { bottom: bottomInset + 100 }]}>
        {/* Author avatar + follow */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            onPress={onFollow}
            activeOpacity={0.8}
            disabled={!onFollow}
            style={styles.authorAvatarTouch}
          >
            <View style={styles.authorAvatar}>
              <Text style={styles.authorAvatarText}>{reel.authorInitial}</Text>
              <View style={[styles.followBadge, isFollowing && styles.followBadgeFollowing]}>
                <Ionicons name={isFollowing ? "checkmark" : "add"} size={10} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.actionText}>{isFollowing ? "Following" : "Follow"}</Text>
          <Text style={styles.actionSubtext}>{formatCount(reel.teacherFollowersCount)} followers</Text>
        </View>

        {/* Like */}
        <TouchableOpacity style={styles.actionGroup} onPress={() => animateLike()} activeOpacity={0.7}>
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={30}
              color={isLiked ? "#FF3B5C" : "#FFFFFF"}
            />
          </Animated.View>
          <Text style={styles.actionText}>{formatCount(likesCount)}</Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionGroup} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFFFFF" />
          <Text style={styles.actionText}>{reel.comments}</Text>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity style={styles.actionGroup} onPress={onSave} activeOpacity={0.7}>
          <Ionicons
            name={isSaved ? "bookmark" : "bookmark-outline"}
            size={28}
            color={isSaved ? "#FFB300" : "#FFFFFF"}
          />
          <Text style={styles.actionText}>{isSaved ? "Saved" : "Save"}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionGroup} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="paper-plane-outline" size={26} color="#FFFFFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info overlay — animated show/hide */}
      <Animated.View
        style={[
          styles.bottomOverlayWrap,
          {
            opacity: infoAnim,
            transform: [{ translateY: infoTranslateY }],
          },
        ]}
        pointerEvents={infoVisible ? "auto" : "none"}
      >
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.7)", "rgba(0,0,0,0.85)"]}
          style={[styles.bottomOverlay, { paddingBottom: bottomInset + 90 }]}
        >
          {/* Author row — tap to open teacher profile */}
          <View style={styles.authorRow}>
            <TouchableOpacity
              style={styles.authorPill}
              onPress={onTeacherPress}
              activeOpacity={0.8}
              disabled={!onTeacherPress}
            >
              <View style={styles.authorSmallAvatar}>
                <Text style={styles.authorSmallText}>{reel.authorInitial}</Text>
              </View>
              <View style={styles.authorNameBlock}>
                <Text style={styles.authorName}>{reel.author}</Text>
                <Text style={styles.authorFollowers}>
                  {formatCount(reel.teacherFollowersCount)} followers
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>{reel.category}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.reelTitle} numberOfLines={1}>
            {reel.title}
          </Text>

          {/* Description */}
          <Text style={styles.reelDesc} numberOfLines={2}>
            {reel.description}
          </Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statText}>{reel.views}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statText}>{reel.duration}</Text>
            </View>
            <View style={styles.statChip}>
              <Ionicons name="heart" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.statText}>{formatCount(likesCount)}</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Tap hint — only when info hidden; tappable so details open reliably */}
      <Animated.View
        style={[
          styles.tapHint,
          {
            bottom: bottomInset + 90,
            opacity: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          },
        ]}
        pointerEvents={infoVisible ? "none" : "box-only"}
      >
        <TouchableOpacity
          style={styles.tapHintPill}
          onPress={toggleInfo}
          activeOpacity={0.8}
        >
          <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={styles.tapHintText}>Tap for details</Text>
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* =================== STYLES =================== */

const styles = StyleSheet.create({
  /* REEL ITEM */
  reelItem: { width: SCREEN_W },

  /* PLAY AREA */
  playArea: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonShimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  skeletonSpinner: {
    zIndex: 1,
  },
  progressBarTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    zIndex: 4,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#FFB300",
    borderRadius: 1,
  },
  playCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },

  /* ACTIONS BAR */
  actionsBar: {
    position: "absolute",
    right: 14,
    alignItems: "center",
    gap: 22,
    zIndex: 5,
  },
  actionGroup: { alignItems: "center", gap: 4 },
  actionText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  actionSubtext: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },

  /* AUTHOR AVATAR */
  authorAvatarTouch: {
    marginBottom: 4,
  },
  authorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFB300",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  authorAvatarText: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: "#081B33",
  },
  followBadge: {
    position: "absolute",
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FF3B5C",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#000",
  },
  followBadgeFollowing: {
    backgroundColor: "#34C759",
  },

  /* BOTTOM OVERLAY */
  bottomOverlayWrap: {
    position: "absolute",
    left: 0,
    right: 70,
    bottom: 0,
  },
  bottomOverlay: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },

  /* TAP HINT */
  tapHint: {
    position: "absolute",
    left: 20,
  },
  tapHintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tapHintText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },

  /* AUTHOR ROW */
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  authorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    paddingRight: 14,
    borderRadius: 20,
  },
  authorSmallAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFB300",
    alignItems: "center",
    justifyContent: "center",
  },
  authorSmallText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: "#081B33",
  },
  authorNameBlock: {
    gap: 2,
  },
  authorName: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#FFFFFF",
  },
  authorFollowers: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
  },
  categoryPill: {
    backgroundColor: "rgba(255,179,0,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#FFB300",
  },

  /* TITLE & DESC */
  reelTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  reelDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
    marginBottom: 12,
  },

  /* STATS */
  statsRow: { flexDirection: "row", gap: 14 },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
});
