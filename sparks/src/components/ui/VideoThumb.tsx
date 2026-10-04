import React, { useEffect, useState } from "react";
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../theme";

/**
 * Presigned S3 URLs change on every API response, so cache generated frames
 * by the object path (query string stripped) — one generation per video.
 */
const frameCache = new Map<string, Promise<string | null>>();

const cacheKey = (url: string) => url.split("?")[0];

function frameFromVideo(videoUrl: string): Promise<string | null> {
  const key = cacheKey(videoUrl);
  let pending = frameCache.get(key);
  if (!pending) {
    // Lazy import: builds made before this native module was added would
    // otherwise crash on load instead of just showing the icon placeholder.
    pending = import("expo-video-thumbnails")
      .then((VideoThumbnails) =>
        VideoThumbnails.getThumbnailAsync(videoUrl, { time: 1000, quality: 0.6 })
          .catch(() => VideoThumbnails.getThumbnailAsync(videoUrl, { time: 0, quality: 0.6 }))
      )
      .then((r) => r.uri)
      .catch(() => null);
    frameCache.set(key, pending);
    // Don't pin a failure forever — a later mount may have a fresh URL.
    pending.then((uri) => {
      if (!uri) frameCache.delete(key);
    });
  }
  return pending;
}

interface VideoThumbProps {
  /** Uploaded thumbnail image, if any. */
  thumbnailUrl?: string | null;
  /** Video to pull a frame from when there is no usable thumbnail. */
  videoUrl?: string | null;
  style?: StyleProp<ViewStyle>;
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  iconSize?: number;
}

/**
 * Thumbnail for reels / videos. Falls back to a frame from the video, then to
 * an icon, so a card is never blank.
 */
export function VideoThumb({
  thumbnailUrl,
  videoUrl,
  style = StyleSheet.absoluteFill,
  iconName = "play",
  iconSize = 28,
}: VideoThumbProps) {
  // Remember which URL failed, so a new URL (e.g. refreshed presign) is retried.
  const [failedThumbUrl, setFailedThumbUrl] = useState<string | null>(null);
  const [frameUri, setFrameUri] = useState<string | null>(null);
  const thumbFailed = !!thumbnailUrl && failedThumbUrl === thumbnailUrl;

  const needsFrame = (!thumbnailUrl || thumbFailed) && !!videoUrl;

  useEffect(() => {
    if (!needsFrame || !videoUrl) return;
    let cancelled = false;
    frameFromVideo(videoUrl).then((uri) => {
      if (!cancelled) setFrameUri(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [needsFrame, videoUrl]);

  const uri = thumbnailUrl && !thumbFailed ? thumbnailUrl : frameUri;

  if (uri) {
    return (
      <Image
        source={{ uri, cacheKey: cacheKey(uri) }}
        style={style as StyleProp<ImageStyle>}
        contentFit="cover"
        transition={150}
        onError={() => {
          if (uri === thumbnailUrl) setFailedThumbUrl(thumbnailUrl);
          else setFrameUri(null);
        }}
      />
    );
  }

  return (
    <View style={[style, styles.placeholder]}>
      <Ionicons name={iconName} size={iconSize} color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
