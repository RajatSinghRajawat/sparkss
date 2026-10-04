import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Share,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams, useIsFocused } from "expo-router";
import { fonts, theme } from "../../src/theme";
import {
  useGetSavedReelsQuery,
  useToggleReelLikeMutation,
  useToggleReelSaveMutation,
  useRecordReelViewMutation,
  useToggleFollowMutation,
} from "../../src/store";
import type { ReelFromApi } from "../../src/types/reel.types";
import {
  ReelPlayerItem,
  mapReelFromApi,
  type Reel,
} from "../../src/components/ui/ReelPlayerItem";

const { height: SCREEN_H } = Dimensions.get("window");
const SAVED_PAGE_SIZE = 10;

export default function SavedReelsScreen() {
  const router = useRouter();
  const { reelId: targetReelId } = useLocalSearchParams<{ reelId?: string }>();
  const insets = useSafeAreaInsets();
  const isScreenFocused = useIsFocused();
  const reelHeight = SCREEN_H;
  const listRef = useRef<FlatList<Reel>>(null);
  // Keyed by reel id: the screen stays mounted, so a boolean only ever
  // jumped to the first reel opened from a link.
  const jumpedToReelRef = useRef<string | null>(null);
  const viewedReelIds = useRef<Set<string>>(new Set());
  const requestedPageRef = useRef(1);

  const [page, setPage] = useState(1);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());
  const [followingTeacherIds, setFollowingTeacherIds] = useState<Set<string>>(new Set());
  const [likesCountMap, setLikesCountMap] = useState<Record<string, number>>({});

  const { data, isFetching, isError, refetch } = useGetSavedReelsQuery({
    page,
    limit: SAVED_PAGE_SIZE,
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
    // Merge instead of replacing on page 1: un-saving a reel invalidates this
    // query, and a refetch must not yank the reel the user is watching.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulates paged reels across API pages.
    setReels((prev) => {
      if (prev.length === 0) return mapped;
      const existingIds = new Set(prev.map((r) => r.id));
      const newReels = mapped.filter((r) => !existingIds.has(r.id));
      if (newReels.length === 0) return prev;
      return [...prev, ...newReels];
    });
    setLikedIds((prev) => {
      const next = new Set(prev);
      list.forEach((r: ReelFromApi) => {
        if (r.isReelLike) next.add(r._id);
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
  }, [data?.data?.reels]);

  // Record a view once per reel per session, like the main reels feed does.
  useEffect(() => {
    const reel = reels[activeIndex];
    if (!reel?.id || viewedReelIds.current.has(reel.id)) return;
    viewedReelIds.current.add(reel.id);
    recordView(reel.id).catch(() => {});
  }, [activeIndex, reels, recordView]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching) return;
    const next = page + 1;
    if (next > totalPages || requestedPageRef.current >= next) return;
    requestedPageRef.current = next;
    setPage(next);
  }, [hasMore, isFetching, page, totalPages]);

  useEffect(() => {
    if (reels.length > 0 && activeIndex >= reels.length - 3) {
      loadMore();
    }
  }, [activeIndex, reels.length, loadMore]);

  // Opened by tapping a card in the profile grid — jump straight to that reel.
  useEffect(() => {
    if (!targetReelId || jumpedToReelRef.current === targetReelId) return;
    const index = reels.findIndex((r) => r.id === targetReelId);
    if (index < 0) {
      loadMore();
      return;
    }
    jumpedToReelRef.current = targetReelId;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot jump to the tapped reel.
    setActiveIndex(index);
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, animated: false });
    });
  }, [targetReelId, reels, loadMore]);

  const updateActiveIndexFromScroll = useCallback(
    (contentOffsetY: number) => {
      const index = Math.round(contentOffsetY / reelHeight);
      setActiveIndex(Math.max(0, Math.min(index, reels.length - 1)));
    },
    [reelHeight, reels.length]
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

  const handleLike = useCallback(
    async (reelId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const res = await toggleLike(reelId).unwrap();
        const payload = res?.data;
        if (payload) {
          setLikedIds((prev) => {
            const next = new Set(prev);
            if (payload.liked) next.add(reelId);
            else next.delete(reelId);
            return next;
          });
          setLikesCountMap((prev) => ({ ...prev, [reelId]: payload.likesCount }));
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
        const payload = res?.data;
        if (payload) {
          // The reel stays on screen so playback is not interrupted; the profile
          // grid picks up the removal from the invalidated saved-list query.
          setUnsavedIds((prev) => {
            const next = new Set(prev);
            if (payload.saved) next.delete(reelId);
            else next.add(reelId);
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
        const payload = res?.data;
        if (payload) {
          setFollowingTeacherIds((prev) => {
            const next = new Set(prev);
            if (payload.following) next.add(teacherId);
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

  const renderItem = useCallback(
    ({ item, index }: { item: Reel; index: number }) => {
      const dist = index - activeIndex;
      // Keep a live (buffering) player only for prev 1, current and next 2 reels.
      // No live players while this (always-mounted) screen is hidden.
      const shouldLoad = isScreenFocused && dist >= -1 && dist <= 2;
      return (
        <ReelPlayerItem
          reel={item}
          shouldLoad={shouldLoad}
          isActive={isScreenFocused && activeIndex === index}
          isLiked={likedIds.has(item.id)}
          isSaved={!unsavedIds.has(item.id)}
          likesCount={likesCountMap[item.id] ?? item.likesCount}
          isFollowing={item.teacherId ? followingTeacherIds.has(item.teacherId) : false}
          onLike={() => handleLike(item.id)}
          onSave={() => handleSave(item.id)}
          onFollow={item.teacherId ? () => handleFollow(item.teacherId!) : undefined}
          onTeacherPress={
            item.teacherId ? () => router.push(`/teacher/${item.teacherId}` as any) : undefined
          }
          onShare={() => handleShare(item)}
          height={reelHeight}
          bottomInset={insets.bottom}
        />
      );
    },
    [
      activeIndex,
      isScreenFocused,
      likedIds,
      unsavedIds,
      likesCountMap,
      followingTeacherIds,
      handleLike,
      handleSave,
      handleFollow,
      handleShare,
      router,
      reelHeight,
      insets.bottom,
    ]
  );

  const header = useMemo(
    () => (
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Saved Reels</Text>
        <View style={styles.topBarSpacer} />
      </View>
    ),
    [insets.top, router]
  );

  if (reels.length === 0 && isFetching) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.colors?.primary ?? "#FFB300"} />
        {header}
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <Ionicons
          name={isError ? "cloud-offline-outline" : "bookmark-outline"}
          size={64}
          color="rgba(255,255,255,0.4)"
        />
        <Text style={styles.emptyText}>
          {isError ? "Couldn't load saved reels" : "No saved reels yet"}
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn} activeOpacity={0.8}>
          <Text style={styles.retryText}>{isError ? "Retry" : "Refresh"}</Text>
        </TouchableOpacity>
        {header}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={reels}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={reelHeight}
        snapToAlignment="start"
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScrollEndDrag={onScrollEndDrag}
        onEndReached={loadMore}
        onEndReachedThreshold={1.5}
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

      {header}
    </View>
  );
}

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
  retryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  retryText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: "#FFB300",
  },

  /* TOP BAR */
  topBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarSpacer: { width: 38 },
  topTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
