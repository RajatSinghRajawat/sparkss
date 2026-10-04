import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Image,
  Linking,
  Animated,
  RefreshControl,
  Modal,
  Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoThumb } from "../../src/components/ui/VideoThumb";
import { theme, fonts } from "../../src/theme";

import { useGetProfileQuery, useGetHomeQuery } from "../../src/store";
import { BannerAd } from "../../src/components/ads";
import type {
  HomeBannerItem,
  HomePlaylistItem,
  HomeReelItem,
  HomeLongVideoItem,
  HomeTeacherItem,
} from "../../src/types/home.types";

const { width: SCREEN_W } = Dimensions.get("window");
const HEADER_H = 52;
const CHIPS_H = 52;
const TOP_BAR_H = HEADER_H + CHIPS_H;
const SHORT_W = (SCREEN_W - 12 * 2 - 8) / 2;

/* YouTube-style neutral palette for the home feed */
const isDark = theme.mode === "dark";
const YT = {
  bg: isDark ? "#0F0F0F" : "#FFFFFF",
  text: isDark ? "#F1F1F1" : "#0F0F0F",
  meta: isDark ? "#AAAAAA" : "#606060",
  chip: isDark ? "#272727" : "#F2F2F2",
  chipActive: isDark ? "#F1F1F1" : "#0F0F0F",
  chipActiveText: isDark ? "#0F0F0F" : "#FFFFFF",
  divider: isDark ? "#272727" : "#E5E5E5",
  skeleton: isDark ? "#272727" : "#E5E5E5",
  sheet: isDark ? "#212121" : "#FFFFFF",
};

const AVATAR_COLORS = ["#E57373", "#64B5F6", "#81C784", "#FFB74D", "#BA68C8", "#4DB6AC", "#F06292", "#7986CB"];

type ChipKey = "all" | "videos" | "shorts" | "courses" | "teachers";
const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "videos", label: "Videos" },
  { key: "shorts", label: "Shorts" },
  { key: "courses", label: "Courses" },
  { key: "teachers", label: "Teachers" },
];

type MenuTarget = { title: string; message: string; open: () => void };

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function timeAgo(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, label] of units) {
    const v = Math.floor(sec / size);
    if (v >= 1) return `${v} ${label}${v > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

function joinMeta(parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(" · ");
}

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profileData } = useGetProfileQuery(undefined, { refetchOnFocus: true });
  const {
    data: homeData,
    isLoading: homeLoading,
    isFetching,
    refetch,
  } = useGetHomeQuery(undefined, { refetchOnFocus: true });

  const [chip, setChip] = useState<ChipKey>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const profile = profileData?.data;
  const displayName = profile?.name ?? "Student";
  const initials = displayName.split(" ").map((w) => w.charAt(0)).join("").toUpperCase().slice(0, 2) || "S";

  const home = homeData?.data;
  const banners: HomeBannerItem[] = home?.banners ?? [];
  const topTeachers: HomeTeacherItem[] = home?.topTeachers ?? [];
  const topPlaylists: HomePlaylistItem[] = home?.topPlaylists ?? [];
  const topReels: HomeReelItem[] = home?.topReels ?? [];
  const topLongVideos: HomeLongVideoItem[] = home?.topLongVideos ?? [];

  // Long videos don't carry the creator avatar; borrow it from top teachers when we have it.
  const avatarByTeacher = useMemo(() => {
    const map = new Map<string, string>();
    (home?.topTeachers ?? []).forEach((t) => t.avatar && map.set(t._id, t.avatar));
    (home?.topPlaylists ?? []).forEach((p) => p.createdBy?.avatar && map.set(p.createdBy._id, p.createdBy.avatar));
    return map;
  }, [home]);

  /* ---------- Collapsible header (hides on scroll down, returns on scroll up) ---------- */
  const [scrollY] = useState(() => new Animated.Value(0));
  const clampedY = Animated.diffClamp(
    scrollY.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp" }),
    0,
    TOP_BAR_H
  );
  const topBarTranslate = clampedY.interpolate({
    inputRange: [0, TOP_BAR_H],
    outputRange: [0, -TOP_BAR_H],
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const selectChip = (key: ChipKey) => {
    setChip(key);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  const handleBannerPress = (item: HomeBannerItem) => {
    const link = item.link?.trim();
    // openURL rejects on a malformed or unhandled link; unhandled that surfaces
    // as a redbox in dev and a silent crash path in release.
    if (link) Linking.openURL(link).catch(() => {});
  };

  const openVideo = (item: HomeLongVideoItem) =>
    item.playlist?._id &&
    router.push({
      pathname: "/playlist/[id]",
      params: { id: item.playlist._id, videoId: item._id },
    } as const);
  const openReel = (item: HomeReelItem) =>
    router.push({ pathname: "/reel", params: { reelId: item._id } } as const);
  const openPlaylist = (item: HomePlaylistItem) =>
    router.push({ pathname: "/playlist/[id]", params: { id: item._id } } as const);
  const openTeacher = (id: string) => router.push(`/teacher/${id}` as const);

  const shareMenu = async () => {
    if (!menu) return;
    const msg = menu.message;
    setMenu(null);
    try {
      await Share.share({ message: msg });
    } catch {}
  };

  /* ---------- Feed pieces ---------- */
  const renderVideo = (item: HomeLongVideoItem) => (
    <VideoCard
      key={`v-${item._id}`}
      video={item}
      avatar={item.createdBy ? avatarByTeacher.get(item.createdBy._id) ?? null : null}
      onPress={() => openVideo(item)}
      onChannelPress={item.createdBy ? () => openTeacher(item.createdBy!._id) : undefined}
      onMenu={() =>
        setMenu({
          title: item.title,
          message: `Check out "${item.title}" by ${item.createdBy?.name ?? "a teacher"} on Sparks!`,
          open: () => openVideo(item),
        })
      }
    />
  );

  const renderPlaylist = (item: HomePlaylistItem) => (
    <PlaylistCard
      key={`p-${item._id}`}
      playlist={item}
      onPress={() => openPlaylist(item)}
      onChannelPress={item.createdBy ? () => openTeacher(item.createdBy._id) : undefined}
      onMenu={() =>
        setMenu({
          title: item.name,
          message: `Check out the course "${item.name}" on Sparks!`,
          open: () => openPlaylist(item),
        })
      }
    />
  );

  const shortsShelf = (
    <ShortsShelf key="shorts" reels={topReels} onPress={openReel} onViewAll={() => router.push("/reel" as const)} />
  );
  const teachersShelf = (
    <TeachersShelf key="teachers" teachers={topTeachers} onPress={openTeacher} />
  );

  const buildAllFeed = () => {
    const feed: React.ReactNode[] = [];
    const videos = [...topLongVideos];
    const playlists = [...topPlaylists];

    banners.slice(0, 1).forEach((b) =>
      feed.push(<BannerCard key={`b-${b._id}`} banner={b} onPress={() => handleBannerPress(b)} />)
    );
    videos.splice(0, 1).forEach((v) => feed.push(renderVideo(v)));
    if (topReels.length) feed.push(shortsShelf);
    videos.splice(0, 2).forEach((v) => feed.push(renderVideo(v)));
    playlists.splice(0, 1).forEach((p) => feed.push(renderPlaylist(p)));
    if (topTeachers.length) feed.push(teachersShelf);
    banners.slice(1).forEach((b) =>
      feed.push(<BannerCard key={`b-${b._id}`} banner={b} onPress={() => handleBannerPress(b)} />)
    );

    // Interleave the rest: two videos, then a course.
    while (videos.length || playlists.length) {
      videos.splice(0, 2).forEach((v) => feed.push(renderVideo(v)));
      playlists.splice(0, 1).forEach((p) => feed.push(renderPlaylist(p)));
    }
    return feed;
  };

  const renderFeed = (): React.ReactNode => {
    switch (chip) {
      case "videos":
        return topLongVideos.length ? topLongVideos.map(renderVideo) : <EmptyFeed text="No videos yet" />;
      case "shorts":
        return topReels.length ? (
          <ShortsGrid reels={topReels} onPress={openReel} />
        ) : (
          <EmptyFeed text="No shorts yet" />
        );
      case "courses":
        return topPlaylists.length ? (
          <>
            {topPlaylists.map(renderPlaylist)}
            <ViewAllRow label="View all courses" onPress={() => router.push("/course" as const)} />
          </>
        ) : (
          <EmptyFeed text="No courses yet" />
        );
      case "teachers":
        return topTeachers.length ? (
          <TeachersList teachers={topTeachers} onPress={openTeacher} />
        ) : (
          <EmptyFeed text="No teachers yet" />
        );
      default: {
        const feed = buildAllFeed();
        return feed.length ? feed : <EmptyFeed text="Nothing here yet. Pull down to refresh." />;
      }
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: YT.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {homeLoading ? (
        <View style={{ paddingTop: insets.top + TOP_BAR_H }}>
          <FeedSkeleton />
        </View>
      ) : (
        <Animated.ScrollView
          ref={scrollRef as any}
          style={styles.scroll}
          contentContainerStyle={{ paddingTop: insets.top + TOP_BAR_H, paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={insets.top + TOP_BAR_H}
              tintColor={YT.text}
              colors={[theme.colors.primary]}
            />
          }
        >
          {renderFeed()}

          <View style={styles.bannerAdWrap}>
            <BannerAd />
          </View>
        </Animated.ScrollView>
      )}

      {/* =================== TOP BAR (header + chips) =================== */}
      <Animated.View
        style={[
          styles.topBar,
          { paddingTop: insets.top, backgroundColor: YT.bg, transform: [{ translateY: topBarTranslate }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Ionicons name="flash" size={15} color="#FFFFFF" />
            </View>
            <Text style={[styles.logoText, { color: YT.text }]}>Sparks</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon} hitSlop={6}>
              <Ionicons name="notifications-outline" size={24} color={YT.text} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerIcon}
              hitSlop={6}
              onPress={() => router.push("/search" as const)}
            >
              <Ionicons name="search-outline" size={24} color={YT.text} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={6} onPress={() => router.push("/profile")} activeOpacity={0.8}>
              {profile?.image ? (
                <Image source={{ uri: profile.image }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: colorForName(displayName) }]}>
                  <Text style={styles.headerAvatarText}>{initials.charAt(0)}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <TouchableOpacity
            style={[styles.exploreChip, { backgroundColor: YT.chip }]}
            onPress={() => router.push("/search" as const)}
            activeOpacity={0.8}
          >
            <Ionicons name="compass-outline" size={20} color={YT.text} />
            <Text style={[styles.chipText, { color: YT.text }]}>Explore</Text>
          </TouchableOpacity>
          <View style={[styles.chipDivider, { backgroundColor: YT.divider }]} />
          {CHIPS.map((c) => {
            const active = chip === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, { backgroundColor: active ? YT.chipActive : YT.chip }]}
                onPress={() => selectChip(c.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, { color: active ? YT.chipActiveText : YT.text }]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {isFetching && !refreshing && !homeLoading ? <View style={styles.fetchBar} /> : null}
      </Animated.View>

      {/* Keep the status bar area solid while the top bar slides away */}
      <View style={[styles.statusCover, { height: insets.top, backgroundColor: YT.bg }]} />

      {/* =================== ⋮ MENU SHEET =================== */}
      <Modal visible={!!menu} transparent animationType="slide" onRequestClose={() => setMenu(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMenu(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: YT.sheet, paddingBottom: insets.bottom + 12 }]}>
            <View style={[styles.sheetHandle, { backgroundColor: YT.divider }]} />
            <Text style={[styles.sheetTitle, { color: YT.meta }]} numberOfLines={1}>
              {menu?.title}
            </Text>
            <SheetItem
              icon="play-outline"
              label="Play"
              onPress={() => {
                const open = menu?.open;
                setMenu(null);
                open?.();
              }}
            />
            <SheetItem icon="arrow-redo-outline" label="Share" onPress={shareMenu} />
            <SheetItem icon="close-circle-outline" label="Cancel" onPress={() => setMenu(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/* =================== SUB COMPONENTS =================== */

function ChannelAvatar({
  name,
  uri,
  size = 36,
  onPress,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  onPress?: () => void;
}) {
  const dims = { width: size, height: size, borderRadius: size / 2 };
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} activeOpacity={0.8}>
      {uri ? (
        <Image source={{ uri }} style={[dims, { backgroundColor: YT.skeleton }]} />
      ) : (
        <View style={[dims, styles.avatarFallback, { backgroundColor: colorForName(name) }]}>
          <Text style={[styles.avatarFallbackText, { fontSize: size * 0.42 }]}>
            {(name || "T").charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function CardDetails({
  title,
  meta,
  channel,
  avatar,
  onChannelPress,
  onMenu,
}: {
  title: string;
  meta: string;
  channel: string;
  avatar?: string | null;
  onChannelPress?: () => void;
  onMenu: () => void;
}) {
  return (
    <View style={styles.details}>
      <ChannelAvatar name={channel} uri={avatar} onPress={onChannelPress} />
      <View style={styles.detailsText}>
        <Text style={[styles.videoTitle, { color: YT.text }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.videoMeta, { color: YT.meta }]} numberOfLines={2}>
          {meta}
        </Text>
      </View>
      <TouchableOpacity onPress={onMenu} hitSlop={10} style={styles.moreBtn}>
        <Ionicons name="ellipsis-vertical" size={18} color={YT.text} />
      </TouchableOpacity>
    </View>
  );
}

function VideoCard({
  video,
  avatar,
  onPress,
  onChannelPress,
  onMenu,
}: {
  video: HomeLongVideoItem;
  avatar: string | null;
  onPress: () => void;
  onChannelPress?: () => void;
  onMenu: () => void;
}) {
  const channel = video.createdBy?.name ?? "Sparks";
  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.videoThumb, { backgroundColor: YT.skeleton }]}>
        <VideoThumb thumbnailUrl={video.thumbnail?.url} videoUrl={video.video?.url} iconName="play" iconSize={40} />
        {video.duration ? (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
          </View>
        ) : null}
      </View>
      <CardDetails
        title={video.title}
        channel={channel}
        avatar={avatar}
        meta={joinMeta([channel, video.playlist?.name, timeAgo(video.createdAt)])}
        onChannelPress={onChannelPress}
        onMenu={onMenu}
      />
    </TouchableOpacity>
  );
}

function PlaylistCard({
  playlist,
  onPress,
  onChannelPress,
  onMenu,
}: {
  playlist: HomePlaylistItem;
  onPress: () => void;
  onChannelPress?: () => void;
  onMenu: () => void;
}) {
  const thumbUrl = playlist.banner?.url ?? null;
  const channel = playlist.createdBy?.name ?? "Sparks";
  const rating =
    playlist.averageRating != null && (playlist.ratingCount ?? 0) > 0
      ? `★ ${playlist.averageRating.toFixed(1)}`
      : null;
  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={0.9} onPress={onPress}>
      {/* Stacked layers above the thumbnail, like YouTube playlists */}
      <View style={styles.stackWrap}>
        <View style={[styles.stackLayer2, { backgroundColor: isDark ? "#3A3A3A" : "#CFCFCF" }]} />
        <View style={[styles.stackLayer1, { backgroundColor: isDark ? "#555555" : "#A8A8A8" }]} />
      </View>
      <View style={[styles.videoThumb, styles.playlistThumb, { backgroundColor: YT.skeleton }]}>
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Ionicons name="school-outline" size={40} color={YT.meta} />
          </View>
        )}
        <View style={styles.playlistBadge}>
          <Ionicons name="list" size={14} color="#FFF" />
          <Text style={styles.durationText}>{playlist.videoCount} videos</Text>
        </View>
      </View>
      <CardDetails
        title={playlist.name}
        channel={channel}
        avatar={playlist.createdBy?.avatar}
        meta={joinMeta([channel, "Course", `${formatViews(playlist.enrollmentsCount)} enrolled`, rating])}
        onChannelPress={onChannelPress}
        onMenu={onMenu}
      />
    </TouchableOpacity>
  );
}

function BannerCard({ banner, onPress }: { banner: HomeBannerItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.videoCard} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.videoThumb, { backgroundColor: YT.skeleton }]}>
        <Image source={{ uri: banner.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </View>
      <View style={styles.details}>
        <View style={[styles.sponsorIcon, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="flash" size={18} color="#FFFFFF" />
        </View>
        <View style={styles.detailsText}>
          {banner.title ? (
            <Text style={[styles.videoTitle, { color: YT.text }]} numberOfLines={2}>
              {banner.title}
            </Text>
          ) : null}
          <View style={styles.sponsorRow}>
            <Text style={[styles.sponsorTag, { color: YT.text }]}>Featured</Text>
            <Text style={[styles.videoMeta, { color: YT.meta }]}> · Sparks</Text>
          </View>
        </View>
        {banner.link ? (
          <View style={[styles.ctaBtn, { backgroundColor: YT.chip }]}>
            <Text style={[styles.ctaText, { color: YT.text }]}>Open</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function ShelfHeader({ icon, title, onViewAll }: { icon?: React.ReactNode; title: string; onViewAll?: () => void }) {
  return (
    <View style={styles.shelfHeader}>
      <View style={styles.shelfTitleRow}>
        {icon}
        <Text style={[styles.shelfTitle, { color: YT.text }]}>{title}</Text>
      </View>
      {onViewAll ? (
        <TouchableOpacity onPress={onViewAll} hitSlop={8}>
          <Text style={[styles.viewAll, { color: theme.colors.secondary }]}>View all</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ShortsLogo() {
  return (
    <View style={styles.shortsLogo}>
      <Ionicons name="play" size={11} color="#FFF" />
    </View>
  );
}

function ShortCard({ reel, width, onPress }: { reel: HomeReelItem; width: number; onPress: () => void }) {
  return (
    <TouchableOpacity style={{ width }} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.shortThumb, { backgroundColor: YT.skeleton }]}>
        <VideoThumb thumbnailUrl={reel.thumbnail?.url} videoUrl={reel.video?.url} />
        <View style={styles.shortGradient} />
        <Ionicons name="ellipsis-vertical" size={16} color="#FFF" style={styles.shortMore} />
        <View style={styles.shortInfo}>
          <Text style={styles.shortTitle} numberOfLines={2}>
            {reel.title}
          </Text>
          <Text style={styles.shortViews}>{formatViews(reel.views ?? 0)} views</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ShortsShelf({
  reels,
  onPress,
  onViewAll,
}: {
  reels: HomeReelItem[];
  onPress: (r: HomeReelItem) => void;
  onViewAll: () => void;
}) {
  return (
    <View style={styles.shelf}>
      <ShelfHeader icon={<ShortsLogo />} title="Shorts" onViewAll={onViewAll} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortsRow}>
        {reels.map((r) => (
          <ShortCard key={r._id} reel={r} width={SHORT_W} onPress={() => onPress(r)} />
        ))}
      </ScrollView>
      <View style={[styles.shelfDivider, { backgroundColor: YT.divider }]} />
    </View>
  );
}

function ShortsGrid({ reels, onPress }: { reels: HomeReelItem[]; onPress: (r: HomeReelItem) => void }) {
  return (
    <View style={styles.shortsGrid}>
      {reels.map((r) => (
        <ShortCard key={r._id} reel={r} width={SHORT_W} onPress={() => onPress(r)} />
      ))}
    </View>
  );
}

function TeachersShelf({ teachers, onPress }: { teachers: HomeTeacherItem[]; onPress: (id: string) => void }) {
  return (
    <View style={styles.shelf}>
      <ShelfHeader title="Top teachers" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teacherRow}>
        {teachers.map((t) => (
          <TouchableOpacity key={t._id} style={styles.teacherItem} activeOpacity={0.8} onPress={() => onPress(t._id)}>
            <ChannelAvatar name={t.name} uri={t.avatar} size={64} />
            <Text style={[styles.teacherName, { color: YT.text }]} numberOfLines={1}>
              {t.name}
            </Text>
            <Text style={[styles.teacherSubs, { color: YT.meta }]} numberOfLines={1}>
              {formatViews(t.followersCount)} followers
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={[styles.shelfDivider, { backgroundColor: YT.divider }]} />
    </View>
  );
}

function TeachersList({ teachers, onPress }: { teachers: HomeTeacherItem[]; onPress: (id: string) => void }) {
  return (
    <View style={styles.teacherList}>
      {teachers.map((t) => (
        <TouchableOpacity key={t._id} style={styles.teacherListItem} activeOpacity={0.8} onPress={() => onPress(t._id)}>
          <ChannelAvatar name={t.name} uri={t.avatar} size={56} />
          <View style={styles.detailsText}>
            <Text style={[styles.teacherListName, { color: YT.text }]} numberOfLines={1}>
              {t.name}
            </Text>
            <Text style={[styles.videoMeta, { color: YT.meta }]} numberOfLines={1}>
              {joinMeta([
                `${formatViews(t.followersCount)} followers`,
                `${formatViews(t.totalReelViews)} views`,
              ])}
            </Text>
          </View>
          <View style={[styles.ctaBtn, { backgroundColor: YT.chipActive }]}>
            <Text style={[styles.ctaText, { color: YT.chipActiveText }]}>View</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ViewAllRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.viewAllRow, { borderColor: YT.divider }]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.ctaText, { color: YT.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={YT.text} />
    </TouchableOpacity>
  );
}

function EmptyFeed({ text }: { text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="videocam-off-outline" size={48} color={YT.meta} />
      <Text style={[styles.emptyText, { color: YT.meta }]}>{text}</Text>
    </View>
  );
}

function SheetItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sheetItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={YT.text} />
      <Text style={[styles.sheetItemText, { color: YT.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FeedSkeleton() {
  const [pulse] = useState(() => new Animated.Value(0.5));
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bone = { backgroundColor: YT.skeleton };
  return (
    <Animated.View style={{ opacity: pulse }}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.videoCard}>
          <View style={[styles.videoThumb, bone]} />
          <View style={styles.details}>
            <View style={[styles.skelAvatar, bone]} />
            <View style={styles.detailsText}>
              <View style={[styles.skelLine, bone, { width: "90%" }]} />
              <View style={[styles.skelLine, bone, { width: "60%", marginTop: 8 }]} />
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

/* =================== STYLES =================== */

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  /* TOP BAR */
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 4,
  },
  statusCover: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 11, elevation: 5 },
  header: {
    height: HEADER_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 14,
    paddingRight: 12,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  logoMark: {
    width: 30,
    height: 21,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 18 },
  headerIcon: { padding: 2 },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { fontFamily: fonts.semiBold, fontSize: 13, color: "#FFF" },
  notifDot: {
    position: "absolute",
    top: 1,
    right: 1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#FF0033",
    borderWidth: 1.5,
    borderColor: YT.bg,
  },

  /* CHIPS */
  chipScroll: { height: CHIPS_H, flexGrow: 0 },
  chipRow: { alignItems: "center", paddingHorizontal: 12, gap: 8 },
  exploreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chipDivider: { width: 1, height: 24, marginHorizontal: 2 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 8, justifyContent: "center" },
  chipText: { fontFamily: fonts.semiBold, fontSize: 14 },
  fetchBar: {
    position: "absolute",
    left: 0,
    bottom: 0,
    height: 2,
    width: "35%",
    backgroundColor: theme.colors.primary,
  },

  /* VIDEO CARD */
  videoCard: { marginBottom: 20 },
  videoThumb: { width: SCREEN_W, aspectRatio: 16 / 9, overflow: "hidden" },
  durationBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  durationText: { fontFamily: fonts.semiBold, fontSize: 12, color: "#FFF" },
  details: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingTop: 12, gap: 12 },
  detailsText: { flex: 1 },
  videoTitle: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  videoMeta: { fontFamily: fonts.regular, fontSize: 12, marginTop: 3, lineHeight: 17 },
  moreBtn: { paddingTop: 2 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarFallbackText: { fontFamily: fonts.semiBold, color: "#FFF" },

  /* PLAYLIST */
  stackWrap: { alignItems: "center" },
  stackLayer2: { width: SCREEN_W - 48, height: 4, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  stackLayer1: {
    width: SCREEN_W - 28,
    height: 4,
    marginTop: 2,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  playlistThumb: { marginTop: 2 },
  playlistBadge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  /* BANNER (featured) */
  sponsorIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sponsorRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  sponsorTag: { fontFamily: fonts.bold, fontSize: 12 },
  ctaBtn: { paddingHorizontal: 14, height: 34, borderRadius: 17, justifyContent: "center", alignSelf: "center" },
  ctaText: { fontFamily: fonts.semiBold, fontSize: 14 },

  /* SHELVES */
  shelf: { marginBottom: 20 },
  shelfHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  shelfTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  shelfTitle: { fontFamily: fonts.bold, fontSize: 18 },
  viewAll: { fontFamily: fonts.semiBold, fontSize: 14 },
  shelfDivider: { height: 4, marginTop: 20 },

  /* SHORTS */
  shortsLogo: {
    width: 22,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#FF0033",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  shortsRow: { paddingHorizontal: 12, gap: 8 },
  shortsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 8, rowGap: 12 },
  shortThumb: { width: "100%", aspectRatio: 9 / 16, borderRadius: 12, overflow: "hidden" },
  shortGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "40%",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  shortMore: { position: "absolute", top: 10, right: 6 },
  shortInfo: { position: "absolute", left: 10, right: 10, bottom: 10 },
  shortTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 19,
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  shortViews: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: "#FFF",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },

  /* TEACHERS */
  teacherRow: { paddingHorizontal: 12, gap: 16 },
  teacherItem: { width: 80, alignItems: "center" },
  teacherName: { fontFamily: fonts.medium, fontSize: 12, marginTop: 8, textAlign: "center" },
  teacherSubs: { fontFamily: fonts.regular, fontSize: 11, marginTop: 2, textAlign: "center" },
  teacherList: { paddingHorizontal: 12, gap: 18 },
  teacherListItem: { flexDirection: "row", alignItems: "center", gap: 14 },
  teacherListName: { fontFamily: fonts.semiBold, fontSize: 15 },

  /* MISC */
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginHorizontal: 12,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  empty: { alignItems: "center", justifyContent: "center", paddingVertical: 80, gap: 12 },
  emptyText: { fontFamily: fonts.medium, fontSize: 14 },
  bannerAdWrap: { marginTop: 8, marginBottom: 8, alignItems: "center" },

  /* SKELETON */
  skelAvatar: { width: 36, height: 36, borderRadius: 18 },
  skelLine: { height: 12, borderRadius: 6 },

  /* SHEET */
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 8 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontFamily: fonts.medium, fontSize: 13, paddingHorizontal: 20, paddingVertical: 8 },
  sheetItem: { flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 20, height: 52 },
  sheetItemText: { fontFamily: fonts.regular, fontSize: 15 },
});
