/**
 * Must be imported at app entry (e.g. top of _layout.tsx).
 * Do not call configure() inside a component.
 */
import { AppState, PermissionsAndroid, Platform } from "react-native";
import Constants from "expo-constants";

// Only load on native when not in Expo Go (react-native-push-notification requires a dev build).
// In Expo Go these stay null and every export below becomes a no-op.
let PushNotification: typeof import("react-native-push-notification").default | null = null;
let Importance: typeof import("react-native-push-notification").Importance | null = null;
let PushNotificationIOS: typeof import("@react-native-community/push-notification-ios").default | null = null;

if (
  (Platform.OS === "android" || Platform.OS === "ios") &&
  Constants.appOwnership !== "expo"
) {
  try {
    const push = require("react-native-push-notification");
    PushNotification = push.default ?? push;
    Importance = push.Importance;
    const pushIOS = require("@react-native-community/push-notification-ios");
    PushNotificationIOS = pushIOS.default ?? pushIOS;
  } catch (e) {
    console.warn("[Push] Native module unavailable, push notifications disabled:", e);
    PushNotification = null;
    Importance = null;
    PushNotificationIOS = null;
  }
}

/** False in Expo Go and on web — push notifications need a development build. */
export const isPushAvailable = PushNotification !== null;

let storedFcmToken: string | null = null;

/** Callback when user opens app from a notification tap (or taps notification). */
let notificationOpenedHandler: ((data: Record<string, string>) => void) | null = null;

export function setNotificationOpenedHandler(handler: ((data: Record<string, string>) => void) | null) {
  notificationOpenedHandler = handler;
}

/** FCM device token from react-native-push-notification (for Firebase). Use when calling saveFcmToken API. */
export function getStoredFcmToken(): string | null {
  return storedFcmToken;
}

/** Get notification data when app was opened by tapping a notification (call early on app load). */
export function getInitialNotification(): Promise<Record<string, string> | null> {
  if (!PushNotification) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    PushNotification!.popInitialNotification((notification) => {
      if (!notification || notification.userInteraction !== true) {
        resolve(null);
        return;
      }
      const data = (notification.data as Record<string, string>) || {};
      resolve(data);
    });
  });
}

// Android: create default channel (required for notifications to work)
if (PushNotification && Importance && Platform.OS === "android") {
  // Android 13+ requires runtime permission; the library only handles iOS permissions
  if (Number(Platform.Version) >= 33) {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS).catch((e) =>
      console.warn("[Push] POST_NOTIFICATIONS request failed:", e)
    );
  }
  PushNotification.createChannel(
    {
      channelId: "sparks-default",
      channelName: "Sparks Notifications",
      channelDescription: "Default channel for push notifications",
      importance: Importance.HIGH,
      vibrate: true,
    },
    (created) => console.log("[Push] Channel created:", created)
  );
}

function getNotificationTitleAndBody(notification: Record<string, unknown>): { title: string; body: string } {
  const data = (notification.data as Record<string, string>) || {};
  return {
    title: (notification.title as string) || data?.title || "Sparks",
    body: (notification.message as string) || (notification.body as string) || data?.message || "New message",
  };
}

PushNotification?.configure({
  requestPermissions: true,

  onRegister(token: { os: string; token: string }) {
    const fcmToken = typeof token === "object" && token?.token ? token.token : String(token);
    storedFcmToken = fcmToken;
    console.log("[Push] FCM token received:", fcmToken);
    console.log("PUSH_TOKEN:", fcmToken);
  },

  onNotification(notification: Record<string, unknown> & { finish?: (id: string) => void; userInteraction?: boolean }) {
    // Always log when notification is received (foreground, background, or opened from quit)
    console.log("[Push] NOTIFICATION RECEIVED:", JSON.stringify(notification, null, 2));
    console.log("[Push] NOTIFICATION RECEIVED - title:", notification.title, "body:", notification.message || notification.body, "data:", notification.data);

    const data = (notification.data as Record<string, string>) || {};
    const isOpened = notification.userInteraction === true;

    if (Platform.OS === "ios" && notification.finish && PushNotificationIOS) {
      notification.finish(PushNotificationIOS.FetchResult.NoData);
    }

    // When user tapped notification (from background or from quit), tell app to navigate
    if (isOpened && notificationOpenedHandler && Object.keys(data).length > 0) {
      try {
        notificationOpenedHandler(data);
      } catch (e) {
        console.warn("[Push] notificationOpenedHandler error:", e);
      }
    }

    // When app is in foreground, show a local notification so user sees it
    if (AppState.currentState === "active") {
      const { title, body } = getNotificationTitleAndBody(notification);
      PushNotification?.localNotification({
        channelId: "sparks-default",
        title,
        message: body,
        playSound: true,
        vibrate: true,
      });
    }
  },

  onRegistrationError(err: Error) {
    console.warn("[Push] Registration error:", err);
  },

  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },

  popInitialNotification: true,
});
