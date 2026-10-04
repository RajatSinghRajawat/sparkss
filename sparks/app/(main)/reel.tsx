import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Share,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fonts, theme } from "../../src/theme";
import { useRouter, useLocalSearchParams, useIsFocused } from "expo-router";
import {
  useGetReelsQuery,
  useToggleReelLikeMutation,
  useToggleReelSaveMutation,
  useRecordReelViewMutation,
  useToggleFollowMutation,
} from "../../src/store";
import type { ReelFromApi } from "../../src/types/reel.types";
import { BannerAd, useRewardedAd } from "../../src/components/ads";
import {
  ReelPlayerItem,
  mapReelFromApi,
  type Reel,
} from "../../src/components/ui/ReelPlayerItem";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const REELS_PAGE_SIZE = 5;

type ReelListItem =
  | { type: "reel"; reel: Reel; reelIndex: number; key: string }
  | { type: "ad"; key: string };

// Show one ad after every N reels.
const REELS_PER_AD = 10;

export default function ReelScreen() {
  const router = useRouter();
  const { reelId: targetReelId } = useLocalSearchParams<{ reelId?: string }>();
  const insets = useSafeAreaInsets();
  const isScreenFocused = useIsFocused();
  // The tab bar stays visible, so the list is shorter than the window. Using
  // the window height hid the bottom of every reel (progress bar included)
  // behind the tab bar and made snapping drift.
  const [reelHeight, setReelHeight] = useState(SCREEN_H);
  const listRef = useRef<FlatList<ReelListItem>>(null);
  // Keyed by reel id: the screen stays mounted, so a boolean only ever
  // jumped to the first reel opened from a link.
  const jumpedToReelRef = useRef<string | null>(null);
  const [page, setPage] = useState(1);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeExtendedIndex, setActiveExtendedIndex] = useState(0);
  const rewardedShownRef = useRef<Set<string>>(new Set());
  const viewedReelIds = useRef<Set<string>>(new Set());
  // Guards against requesting the same next page twice (prefetch effect + onEndReached)
  const requestedPageRef = useRef(1);
  const { showRewardedAd } = useRewardedAd();

  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [followingTeacherIds, setFollowingTeacherIds] = useState<Set<string>>(new Set());
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});
  const [activeIndex, setActiveIndex] = useState(0);

  const extendedData = useMemo((): ReelListItem[] => {
    const list: ReelListItem[] = [];
    reels.forEach((reel, i) => {
      // Use position in list so keys stay unique even if the same reel id appears twice (e.g. pagination overlap)
      list.push({ type: "reel", reel, reelIndex: i, key: `reel-${i}-${reel.id}` });
      // Insert a single ad after every REELS_PER_AD reels.
      if ((i + 1) % REELS_PER_AD === 0) list.push({ type: "ad", key: `ad-${i}` });
    });
    return list;
  }, [reels]);

  const { data, isFetching, refetch } = useGetReelsQuery({
    page,
    limit: REELS_PAGE_SIZE,
    sortBy: "createdAt",
    order: "desc",
  });

  const [toggleLike] = useToggleReelLikeMutation();
  const [toggleSave] = useToggleReelSaveMutation();
  const [recordView] = useRecordReelViewMutation();
  const [toggleFollow] = useToggleFollowMutation();

  const pagination = data?.data?.pagination;
  const hasMore = pagination?.hasMore ?? false;
  const totalPages = pagination?.totalPages ?? 1;

  useEffect(() => {
    const list = data?.data?.reels ?? [];
    if (list.length === 0) return;
    const mapped = list.map(mapReelFromApi);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulates paged reels across API pages.
    setReels((prev) => {
      if (page === 1) return mapped;
      const existingIds = new Set(prev.map((r) => r.id));
      const newReels = mapped.filter((r) => !existingIds.has(r.id));
      if (newReels.length === 0) return prev;
      return [...prev, ...newReels];
    });
    // Sync like/save state from API so heart is red & save icon yellow for liked/saved reels
    setLikedIds((prev) => {
      const next = new Set(prev);
      list.forEach((r: ReelFromApi) => {
        if (r.isReelLike) next.add(r._id);
        else next.delete(r._id);
      });
      return next;
    });
    setSavedIds((prev) => {
      const next = new Set(prev);
      list.forEach((r: ReelFromApi) => {
        if (r.isReelSave) next.add(r._id);
        else next.delete(r._id);
      });
      return next;
    });
    setFollowingTeacherIds((prev) => {
      const next = new Set(prev);
      list.forEach((r: ReelFromApi) => {
        const teacherId = r.createdBy?._id;
        if (!teacherId) return;
        if (r.isFollow) next.add(teacherId);
        else next.delete(teacherId);
      });
      return next;
    });
  }, [data?.data?.reels, page]);

  // Coming back to this tab: pick up likes/saves/follows made on other screens.
  const wasFocusedRef = useRef(isScreenFocused);
  useEffect(() => {
    if (isScreenFocused && !wasFocusedRef.current) refetch();
    wasFocusedRef.current = isScreenFocused;
  }, [isScreenFocused, refetch]);

  // Record view when a reel becomes active (once per reel per session)
  useEffect(() => {
    const reel = reels[activeIndex];
    if (!reel?.id || viewedReelIds.current.has(reel.id)) return;
    viewedReelIds.current.add(reel.id);
    recordView(reel.id).catch(() => {});
  }, [activeIndex, reels, recordView]);

  const handleLike = useCallback(
    async (reelId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const res = await toggleLike(reelId).unwrap();
        const data = res?.data;
        if (data) {
          setLikedIds((prev) => {
            const next = new Set(prev);
            if (data.liked) next.add(reelId);
            else next.delete(reelId);
            return next;
          });
          setLikesCountMap((prev) => ({ ...prev, [reelId]: data.likesCount }));
        }
      } catch (_) {}
    },
    [toggleLike]
  );

  const handleSave = useCallback(
    async (reelId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const res = await toggleSave(reelId).unwrap();
        const data = res?.data;
        if (data) {
          setSavedIds((prev) => {
            const next = new Set(prev);
            if (data.saved) next.add(reelId);
            else next.delete(reelId);
            return next;
          });
        }
      } catch (_) {}
    },
    [toggleSave]
  );

  const handleFollow = useCallback(
    async (teacherId: string) => {
      if (!teacherId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        const res = await toggleFollow(teacherId).unwrap();
        const data = res?.data;
        if (data) {
          setFollowingTeacherIds((prev) => {
            const next = new Set(prev);
            if (data.following) next.add(teacherId);
            else next.delete(teacherId);
            return next;
          });
        }
      } catch (_) {}
    },
    [toggleFollow]
  );

  const handleShare = useCallback(async (reel: Reel) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: `Check out "${reel.title}" by ${reel.author} on Sparks!`,
        title: reel.title,
      });
    } catch (_) {}
  }, []);

  const updateActiveIndexFromScroll = useCallback(
    (contentOffsetY: number) => {
      const index = Math.round(contentOffsetY / reelHeight);
      const safeIndex = Math.max(0, Math.min(index, extendedData.length - 1));
      setActiveExtendedIndex(safeIndex);
      const item = extendedData[safeIndex];
      if (item?.type === "reel") setActiveIndex(item.reelIndex);
      if (item?.type === "ad" && !rewardedShownRef.current.has(item.key)) {
        rewardedShownRef.current.add(item.key);
        showRewardedAd();
      }
    },
    [extendedData, reelHeight, showRewardedAd]
  );

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      updateActiveIndexFromScroll(e.nativeEvent.contentOffset.y);
    },
    [updateActiveIndexFromScroll]
  );

  const onScrollEndDrag = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      updateActiveIndexFromScroll(e.nativeEvent.contentOffset.y);
    },
    [updateActiveIndexFromScroll]
  );

  // Load the next batch of 5 reels in the background (deduped, no visible spinner)
  const loadMore = useCallback(() => {
    if (!hasMore || isFetching) return;
    const next = page + 1;
    if (next > totalPages || requestedPageRef.current >= next) return;
    requestedPageRef.current = next;
    setPage(next);
  }, [hasMore, isFetching, page, totalPages]);

  // Prefetch the next 5 reels well before the user reaches the end, so the
  // next batch is already loaded and plays without any visible loading.
  useEffect(() => {
    if (reels.length > 0 && activeIndex >= reels.length - 3) {
      loadMore();
    }
  }, [activeIndex, reels.length, loadMore]);

  // When opened from a reel card on the home page, jump straight to that reel.
  useEffect(() => {
    if (!targetReelId || jumpedToReelRef.current === targetReelId) return;
    const extIndex = extendedData.findIndex(
      (it) => it.type === "reel" && it.reel.id === targetReelId
    );
    if (extIndex < 0) {
      // Not in the loaded pages yet — keep loading until found (or no more pages).
      loadMore();
      return;
    }
    jumpedToReelRef.current = targetReelId;
    const item = extendedData[extIndex];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot jump to a deep-linked reel.
    setActiveExtendedIndex(extIndex);
    if (item.type === "reel") setActiveIndex(item.reelIndex);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: extIndex, animated: false });
    });
  }, [targetReelId, extendedData, loadMore]);

  const renderItem = useCallback(
    ({ item, index: extIndex }: { item: ReelListItem; index: number }) => {
      if (item.type === "reel") {
        const dist = item.reelIndex - activeIndex;
        // Keep a live (buffering) player only for prev 1, current and next 2 reels,
        // and none while this tab is hidden (tabs stay mounted).
        const shouldLoad = isScreenFocused && dist >= -1 && dist <= 2;
        return (
          <ReelPlayerItem
            reel={item.reel}
            shouldLoad={shouldLoad}
            isActive={isScreenFocused && activeExtendedIndex === extIndex}
            isLiked={likedIds.has(item.reel.id)}
            isSaved={savedIds.has(item.reel.id)}
            likesCount={likesCountMap[item.reel.id] ?? item.reel.likesCount}
            isFollowing={item.reel.teacherId ? followingTeacherIds.has(item.reel.teacherId) : false}
            onLike={() => handleLike(item.reel.id)}
            onSave={() => handleSave(item.reel.id)}
            onFollow={item.reel.teacherId ? () => handleFollow(item.reel.teacherId!) : undefined}
            onTeacherPress={
              item.reel.teacherId
                ? () => router.push(`/teacher/${item.reel.teacherId}` as any)
                : undefined
            }
            onShare={() => handleShare(item.reel)}
            height={reelHeight}
            bottomInset={insets.bottom}
          />
        );
      }
      // Single ad slot (shown once every REELS_PER_AD reels)
      return (
        <View style={[styles.adSlot, { height: reelHeight }]}>
          <View style={[styles.adSlotContent, styles.rewardedSlot]}>
            <Ionicons
              name="play-circle-outline"
              size={56}
              color="rgba(255,255,255,0.25)"
            />
            <Text style={styles.adSlotTitle}>Quick break 🎬</Text>
            <Text style={[styles.rewardedSlotText, { color: theme.colors.textSecondary }]}>
              Thanks for watching! Swipe up for more reels.
            </Text>
            <View style={styles.adSlotBanner}>
              <BannerAd />
            </View>
          </View>
        </View>
      );
    },
    [
      activeExtendedIndex,
      activeIndex,
      isScreenFocused,
      likedIds,
      savedIds,
      followingTeacherIds,
      likesCountMap,
      handleLike,
      handleSave,
      handleFollow,
      handleShare,
      router,
      reelHeight,
      insets,
    ]
  );


  if (reels.length === 0 && isFetching) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.colors?.primary ?? "#FFB300"} />
      </View>
    );
  }

  if (reels.length === 0 && !isFetching) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons name="videocam-outline" size={64} color="rgba(255,255,255,0.4)" />
        <Text style={styles.emptyText}>No reels yet</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = Math.round(e.nativeEvent.layout.height);
        if (h > 0 && Math.abs(h - reelHeight) > 1) setReelHeight(h);
      }}
    >
      <FlatList
        ref={listRef}
        data={extendedData}
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={reelHeight}
        snapToAlignment="start"
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        onEndReached={loadMore}
        onEndReachedThreshold={1.5}
        // ─── Performance: keep only a small window of reels mounted ───
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        updateCellsBatchingPeriod={50}
        getItemLayout={(_, index) => ({
          length: reelHeight,
          offset: reelHeight * index,
          index,
        })}
      />

      {/* Top overlay header */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Text style={styles.topTitle}>Reels</Text>
      </View>
    </View>
  );
}

/* =================== STYLES =================== */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: "rgba(255,255,255,0.6)",
    marginTop: 12,
  },
  adSlot: {
    width: SCREEN_W,
    justifyContent: "center",
    alignItems: "center",
  },
  adSlotContent: {
    width: "100%",
    alignItems: "center",
  },
  rewardedSlot: {
    padding: 24,
    justifyContent: "center",
  },
  rewardedSlotText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: "center",
  },
  adSlotTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  adSlotBanner: {
    marginTop: 28,
    alignItems: "center",
  },

  /* TOP BAR */
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
