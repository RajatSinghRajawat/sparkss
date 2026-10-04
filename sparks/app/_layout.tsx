import {
  getInitialNotification,
  setNotificationOpenedHandler,
} from "../src/pushNotification";

import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
} from "@expo-google-fonts/montserrat";
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect } from "react";
import { View, Platform } from "react-native";
import { Provider } from "react-redux";
import { store } from "../src/store";
import { SocketConnector } from "../src/components/SocketConnector";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Show notification when app is in foreground (Expo receives FCM)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Cold start delivers the same tap through both the push library and Expo's
// last-response API; ignore a repeat of the same payload within a few seconds.
let lastNotificationNav: { key: string; at: number } | null = null;

function navigateFromNotificationData(
  router: ReturnType<typeof useRouter>,
  data: Record<string, string>
) {
  const key = JSON.stringify(data ?? {});
  const now = Date.now();
  if (lastNotificationNav && lastNotificationNav.key === key && now - lastNotificationNav.at < 5000) {
    return;
  }
  lastNotificationNav = { key, at: now };
  const screen = data?.screen;
  // Backend test pushes send { type: "test", testId, event } with no `screen`,
  // so tapping them used to do nothing.
  if ((screen === "quiz" || data?.type === "test") && data?.testId) {
    if (/result/i.test(data.event ?? "")) {
      router.push(`/(main)/quiz/result/${data.testId}`);
    } else {
      router.push(`/(main)/quiz/${data.testId}`);
    }
    return;
  }
  if (screen === "message") {
    const message = typeof data.message === "string" ? data.message : "";
    const bannerUrl = typeof data.bannerUrl === "string" ? data.bannerUrl : "";
    router.push({
      pathname: "/(main)/notification-detail",
      params: { message, bannerUrl },
    });
    return;
  }
  if (screen === "reel") {
    router.push("/(main)/reel" as const);
    return;
  }
  if (screen === "playlist" && data?.playlistId) {
    router.push({
      pathname: "/(main)/playlist/[id]",
      params: { id: data.playlistId },
    });
  }
}

function NotificationResponseHandler() {
  const router = useRouter();

  // Android: create channel so FCM notifications are shown (Expo receives FCM)
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("sparks-default", {
        name: "Sparks Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      }).catch(() => {});
    }
  }, []);

  // Log when a notification is received (Expo receives FCM – this will fire when admin sends)
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      console.log("[Push] NOTIFICATION RECEIVED (expo):", {
        title: content.title,
        body: content.body,
        data: content.data,
      });
      console.log("[Push] NOTIFICATION RECEIVED – full:", JSON.stringify(content, null, 2));
    });
    return () => sub.remove();
  }, []);

  // Handle notification open from react-native-push-notification (FCM)
  useEffect(() => {
    setNotificationOpenedHandler((data: Record<string, string>) => {
      console.log("[Push] Notification opened – navigating with data:", data);
      navigateFromNotificationData(router, data);
    });
    return () => setNotificationOpenedHandler(null);
  }, [router]);

  // When app opens from quit by tapping notification, get initial notification
  useEffect(() => {
    getInitialNotification().then((data) => {
      if (data && Object.keys(data).length > 0) {
        console.log("[Push] App opened from notification – initial data:", data);
        navigateFromNotificationData(router, data);
      }
    });
  }, [router]);

  // Handle notification tap (Expo – FCM is received by Expo so this fires when user taps)
  useEffect(() => {
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, string>;
      if (data) navigateFromNotificationData(router, data);
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => sub.remove();
  }, [router]);
  return null;
}

function AdMobInitializer() {
  useEffect(() => {
    if (Platform.OS !== "android" && Platform.OS !== "ios") return;
    if (Constants.appOwnership === "expo") return;
    let mobileAds: (() => {
      initialize: () => Promise<unknown>;
      setRequestConfiguration?: (config: { testDeviceIdentifiers?: string[] }) => Promise<unknown>;
    }) | undefined;
    try {
      const mod = require("react-native-google-mobile-ads");
      mobileAds = mod?.default;
    } catch {
      if (__DEV__) console.warn("AdMob not available (e.g. Expo Go)");
      return;
    }
    if (!mobileAds) return;
    const ads = mobileAds();
    ads
      .initialize()
      .then(() => {
        if (__DEV__ && ads.setRequestConfiguration) {
          return ads.setRequestConfiguration({
            testDeviceIdentifiers: ["EMULATOR"],
          });
        }
      })
      .catch((e: unknown) => {
        if (__DEV__) console.warn("AdMob init failed:", e);
      });
  }, []);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  const onLayoutRootView = useCallback(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  useEffect(() => {
    if (fontError) {
      console.warn("[Fonts] Montserrat failed to load, falling back to system font:", fontError);
    }
  }, [fontError]);

  if (!fontsReady) {
    return null;
  }

  return (
    <Provider store={store}>
      <AdMobInitializer />
      <SocketConnector />
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <Stack screenOptions={{ headerShown: false }} />
        <NotificationResponseHandler />
      </View>
    </Provider>
  );
}
