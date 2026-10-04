import { useEffect, useRef } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../src/theme";
import * as Notifications from "expo-notifications";
import { useAppSelector, useSaveFcmTokenMutation } from "../../src/store";
import { getStoredFcmToken } from "../../src/pushNotification";

export default function MainLayout() {
  const router = useRouter();
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const [saveFcmTokenApi] = useSaveFcmTokenMutation();
  const fcmSyncedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/(auth)/login");
    }
  }, [isAuthenticated, router]);

  // Sync FCM token with backend (use Expo's token – same one that receives FCM from our backend)
  useEffect(() => {
    if (!isAuthenticated) return;
    const syncFcm = async () => {
      if (fcmSyncedRef.current) return;
      let fcm: string | null = null;
      try {
        const res = await Notifications.getDevicePushTokenAsync();
        fcm = res?.data ?? null;
      } catch {
        fcm = getStoredFcmToken();
      }
      if (fcm) {
        saveFcmTokenApi({ fcmToken: fcm })
          .unwrap()
          .then(() => {
            fcmSyncedRef.current = true;
          })
          .catch(() => {});
      }
    };
    const t1 = setTimeout(syncFcm, 1500);
    const t2 = setTimeout(syncFcm, 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isAuthenticated, saveFcmTokenApi]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: "Quiz",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard-outline" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reel"
        options={{
          title: "Reel",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="play-circle" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="course"
        options={{
          title: "Course",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size ?? 26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="teacher/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="playlist/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="change-password"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="following"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="saved-reels"
        options={{
          href: null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="help-center"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="delete-account"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="notification-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="fund-transfer"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
