import { useCallback, useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useAppDispatch,
  useAppSelector,
  restoreAuth,
  getToken,
  getStudent,
  socketConnect,
  useSaveFcmTokenMutation,
} from "../src/store";
import { getStoredFcmToken } from "../src/pushNotification";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

const SOCKET_WAIT_TIMEOUT_MS = 10000;
// Upper bound on the intro video, in case it stalls or never reports its end.
const VIDEO_MAX_MS = 8000;

// Matches the logo artwork's own background so the edges disappear.
const SPLASH_BACKGROUND = "#010005";
const SPLASH_VIDEO = require("../assets/videos/splash.mp4");
const LOGO = require("../assets/images/splash-logo.png");
// Artwork is 900×1600 (9:16).
const LOGO_WIDTH = Math.min(Dimensions.get("window").width * 0.8, 360);
const LOGO_HEIGHT = (LOGO_WIDTH * 16) / 9;

type SplashTarget = "/(main)" | "/(auth)/login";

export default function SplashScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [saveFcmTokenApi] = useSaveFcmTokenMutation();
  const socketStatus = useAppSelector((s) => s.socket?.status ?? "disconnected");
  const [waitingForSocket, setWaitingForSocket] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Auth/socket work picks where to go; the intro video decides when.
  const [target, setTarget] = useState<SplashTarget | null>(null);
  const [videoDone, setVideoDone] = useState(false);
  const finishVideo = useCallback(() => setVideoDone(true), []);

  const player = useVideoPlayer(SPLASH_VIDEO, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    const endSub = player.addListener("playToEnd", finishVideo);
    const statusSub = player.addListener("statusChange", ({ status }) => {
      // Don't hold the user on the splash if the video can't play.
      if (status === "error") finishVideo();
    });
    const timer = setTimeout(finishVideo, VIDEO_MAX_MS);
    return () => {
      endSub.remove();
      statusSub.remove();
      clearTimeout(timer);
    };
  }, [player, finishVideo]);

  useEffect(() => {
    if (target && videoDone) router.replace(target as any);
  }, [target, videoDone, router]);

  useEffect(() => {
    let cancelled = false;

    const go = async () => {
      // Request notification permission (FCM token comes from react-native-push-notification onRegister)
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") {
          console.log("[Push] Token skipped - notification permission not granted");
        } else if (!Device.isDevice) {
          console.log("[Push] Token skipped - use a physical Android device (not emulator) to get FCM token");
        }
      } catch (e) {
        console.warn("[Push] Permission error:", e);
      }

      try {
        const token = await getToken();
        const student = await getStudent();

        if (cancelled) return;
        if (token && student) {
          dispatch(restoreAuth({ student: student as { _id: string; name: string; email: string; isVerified: boolean; createdAt: string }, token }));
          // Use Expo's FCM token (same client that receives notifications from our backend)
          let fcmToken: string | null = null;
          try {
            const res = await Notifications.getDevicePushTokenAsync();
            fcmToken = res?.data ?? null;
            if (fcmToken) console.log("[Push] Expo FCM token (saving to backend):", fcmToken.slice(0, 30) + "...");
          } catch {
            fcmToken = getStoredFcmToken();
          }
          if (fcmToken) {
            try {
              await saveFcmTokenApi({ fcmToken }).unwrap();
            } catch {
              // Non-blocking; app continues
            }
          }
          dispatch(socketConnect());
          setWaitingForSocket(true);
          timeoutRef.current = setTimeout(() => {
            if (cancelled) return;
            setWaitingForSocket(false);
            setTarget("/(main)");
          }, SOCKET_WAIT_TIMEOUT_MS);
        } else {
          dispatch(restoreAuth(null));
          setTarget("/(auth)/login");
        }
      } catch {
        if (!cancelled) {
          dispatch(restoreAuth(null));
          setTarget("/(auth)/login");
        }
      }
    };

    go();
    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [router, dispatch, saveFcmTokenApi]);

  useEffect(() => {
    // "connecting" is the only state worth waiting on. Leaving on "error" and
    // "disconnected" too means a socket that can't reach the server costs the
    // user a moment, not the full SOCKET_WAIT_TIMEOUT_MS staring at the splash.
    if (!waitingForSocket || socketStatus === "connecting") return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leaves the splash once the socket settles.
    setWaitingForSocket(false);
    setTarget("/(main)");
  }, [waitingForSocket, socketStatus]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Logo sits underneath, so there's no blank frame before the video starts */}
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: SPLASH_BACKGROUND,
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
