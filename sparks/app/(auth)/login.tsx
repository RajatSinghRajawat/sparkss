import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  FadeInDown,
  interpolate,
} from "react-native-reanimated";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Login } from "../../src/components/ui";
import { TextButton } from "../../src/components/common";
import { theme, fonts } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useLoginMutation,
  useAppDispatch,
  setCredentials,
  saveToken,
  saveStudent,
} from "../../src/store";
import * as Notifications from "expo-notifications";
import { getStoredFcmToken } from "../../src/pushNotification";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const ICON_COLORS = ["#FFB300", "#1EC8FF", "#A78BFA", "#FF6B35", "#4ADE80", "#FF3B5C", "#FFB300", "#1EC8FF"];

const FLOATING_ICONS = [
  { icon: "school", size: 32, x: 30, y: 80, delay: 0, colors: [ICON_COLORS[0], ICON_COLORS[2], ICON_COLORS[4], ICON_COLORS[0]] },
  { icon: "book", size: 26, x: SCREEN_W - 70, y: 120, delay: 400, colors: [ICON_COLORS[1], ICON_COLORS[3], ICON_COLORS[5], ICON_COLORS[1]] },
  { icon: "flask", size: 28, x: 60, y: 200, delay: 800, colors: [ICON_COLORS[2], ICON_COLORS[4], ICON_COLORS[0], ICON_COLORS[2]] },
  { icon: "calculator", size: 24, x: SCREEN_W - 50, y: 260, delay: 1200, colors: [ICON_COLORS[3], ICON_COLORS[5], ICON_COLORS[1], ICON_COLORS[3]] },
  { icon: "globe", size: 30, x: 40, y: 340, delay: 600, colors: [ICON_COLORS[4], ICON_COLORS[0], ICON_COLORS[2], ICON_COLORS[4]] },
  { icon: "code-slash", size: 22, x: SCREEN_W - 80, y: 380, delay: 1000, colors: [ICON_COLORS[5], ICON_COLORS[1], ICON_COLORS[3], ICON_COLORS[5]] },
  { icon: "bulb", size: 26, x: SCREEN_W / 2 - 10, y: 60, delay: 200, colors: [ICON_COLORS[0], ICON_COLORS[3], ICON_COLORS[5], ICON_COLORS[0]] },
  { icon: "rocket", size: 24, x: SCREEN_W / 2 + 40, y: 180, delay: 1400, colors: [ICON_COLORS[1], ICON_COLORS[4], ICON_COLORS[0], ICON_COLORS[1]] },
] as const;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const formOpacity = useSharedValue(0);
  const formTranslate = useSharedValue(40);

  useEffect(() => {
    formOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    formTranslate.value = withDelay(400, withSpring(0, { damping: 15 }));
  }, []);

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslate.value }],
  }));

  const [loginApi] = useLoginMutation();
  const dispatch = useAppDispatch();

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    try {
      let fcmToken: string | undefined;
      try {
        const res = await Notifications.getDevicePushTokenAsync();
        fcmToken = res?.data ?? getStoredFcmToken() ?? undefined;
      } catch {
        fcmToken = getStoredFcmToken() ?? undefined;
      }
      const res = await loginApi({ email, password, fcmToken }).unwrap();
      const data = res?.data;
      if (data?.student && data?.token) {
        await saveToken(data.token);
        await saveStudent(data.student);
        dispatch(setCredentials({ student: data.student, token: data.token }));
        router.replace("/(main)" as any);
      }
    } catch {
      // Error shown by apiMiddleware
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Animated gradient background */}
      <View style={styles.bgTop}>
        <AnimatedBackground />
        {FLOATING_ICONS.map((item, i) => (
          <FloatingIcon key={i} {...item} />
        ))}
      </View>

      {/* Back button — the splash reaches login with router.replace, so there is
          usually nothing to go back to and the control would be dead. */}
      {router.canGoBack() && (
        <TouchableOpacity
          style={[styles.backBtn, { top: insets.top + 12 }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        // See the note in signup.tsx — this replaces a KeyboardAvoidingView
        // that was nested inside the ScrollView and fought it.
        automaticallyAdjustKeyboardInsets
      >
        {/* Top spacer for bg */}
        <View style={[styles.topSpacer, { paddingTop: insets.top + 50 }]}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.welcomeWrap}
          >
            <View style={styles.logoBadge}>
              <Ionicons name="sparkles" size={24} color="#FFB300" />
            </View>
            <Text style={styles.brandText}>Sparks</Text>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSub}>Sign in to continue your learning journey</Text>
          </Animated.View>
        </View>

        {/* Form card */}
        <View style={styles.keyboardView}>
          <Animated.View
            style={[styles.formCard, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 24 }, formAnimatedStyle]}
          >
            {/* Login form */}
            <Login onLogin={handleLogin} loading={loading} />

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={[styles.forgotText, { color: theme.colors.primary }]}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                Don&apos;t have an account?{" "}
              </Text>
              <TextButton
                title="Sign up"
                onPress={() => router.push("/(auth)/signup")}
              />
            </View>

            {/* Privacy & Terms */}
            <Text style={[styles.legalText, { color: theme.colors.textSecondary }]}>
              By continuing, you agree to our{" "}
              <Text style={[styles.legalLink, { color: theme.colors.primary }]} onPress={() => {}}>
                Terms & Conditions
              </Text>
              {" "}and{" "}
              <Text style={[styles.legalLink, { color: theme.colors.primary }]} onPress={() => {}}>
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

/* =================== ANIMATED BACKGROUND =================== */

function AnimatedBackground() {
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    pulse1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    pulse2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse1.value, [0, 1], [0.15, 0.35]),
    transform: [
      { scale: interpolate(pulse1.value, [0, 1], [0.8, 1.2]) },
      { translateX: interpolate(pulse1.value, [0, 1], [-20, 20]) },
      { translateY: interpolate(pulse1.value, [0, 1], [-10, 10]) },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse2.value, [0, 1], [0.1, 0.3]),
    transform: [
      { scale: interpolate(pulse2.value, [0, 1], [1, 1.3]) },
      { translateX: interpolate(pulse2.value, [0, 1], [15, -15]) },
      { translateY: interpolate(pulse2.value, [0, 1], [10, -20]) },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  return (
    <>
      <Animated.View style={[styles.orb, styles.orb1, orb1Style]} />
      <Animated.View style={[styles.orb, styles.orb2, orb2Style]} />
      <Animated.View style={[styles.ring, ringStyle]} />
    </>
  );
}

/* =================== FLOATING ICON =================== */

function FloatingIcon({ icon, size, x, y, delay, colors }: { icon: string; size: number; x: number; y: number; delay: number; colors: readonly string[] }) {
  const float = useSharedValue(0);
  const opacity = useSharedValue(0);
  // One fixed colour per icon — see the note in signup.tsx.
  const color = colors[0];

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 800 }));
    float.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2500 + delay, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2500 + delay, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.35,
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -18]) },
      { rotate: `${interpolate(float.value, [0, 1], [-8, 8])}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ position: "absolute", left: x, top: y }, animStyle]}>
      <Ionicons name={icon as any} size={size} color={color} />
    </Animated.View>
  );
}

/* =================== STYLES =================== */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#081B33" },

  /* BG */
  bgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.48,
    backgroundColor: "#081B33",
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orb1: {
    width: 280,
    height: 280,
    top: -60,
    left: -40,
    backgroundColor: "#FFB300",
  },
  orb2: {
    width: 220,
    height: 220,
    top: 60,
    right: -50,
    backgroundColor: "#1EC8FF",
  },
  ring: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    top: -30,
    alignSelf: "center",
    left: SCREEN_W / 2 - 150,
  },

  /* BACK */
  backBtn: {
    position: "absolute",
    left: 20,
    zIndex: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* SCROLL */
  scrollContent: {
    flexGrow: 1,
  },
  keyboardView: { flex: 1 },

  /* TOP WELCOME */
  topSpacer: {
    minHeight: SCREEN_H * 0.35,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 30,
  },
  welcomeWrap: { alignItems: "flex-start" },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,179,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brandText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#FFB300",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  welcomeTitle: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  welcomeSub: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
  },

  /* FORM CARD */
  formCard: {
    flex: 1,
    minHeight: SCREEN_H * 0.6,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 24,
    paddingTop: 30,
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  /* FORGOT */
  forgotBtn: {
    alignSelf: "center",
    marginTop: 12,
    paddingVertical: 4,
  },
  forgotText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },

  /* FOOTER */
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    flexWrap: "wrap",
  },
  footerText: {
    fontFamily: fonts.regular,
    fontSize: 15,
  },

  /* LEGAL */
  legalText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  legalLink: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
});
