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
import { Signup } from "../../src/components/ui";
import { TextButton } from "../../src/components/common";
import { theme, fonts } from "../../src/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useSendOTPMutation,
  useVerifyOTPMutation,
  useAppDispatch,
  setCredentials,
  saveToken,
  saveStudent,
} from "../../src/store";
import * as Notifications from "expo-notifications";
import { getStoredFcmToken } from "../../src/pushNotification";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const ICON_COLORS = ["#A78BFA", "#1EC8FF", "#FFB300", "#FF6B35", "#4ADE80", "#FF3B5C"];

const FLOATING_ICONS = [
  { icon: "person-add", size: 30, x: 35, y: 70, delay: 0, colors: [ICON_COLORS[0], ICON_COLORS[2], ICON_COLORS[4], ICON_COLORS[0]] },
  { icon: "mail", size: 24, x: SCREEN_W - 65, y: 100, delay: 500, colors: [ICON_COLORS[1], ICON_COLORS[3], ICON_COLORS[5], ICON_COLORS[1]] },
  { icon: "shield-checkmark", size: 26, x: 50, y: 190, delay: 300, colors: [ICON_COLORS[2], ICON_COLORS[0], ICON_COLORS[4], ICON_COLORS[2]] },
  { icon: "key", size: 22, x: SCREEN_W - 55, y: 240, delay: 800, colors: [ICON_COLORS[3], ICON_COLORS[5], ICON_COLORS[1], ICON_COLORS[3]] },
  { icon: "star", size: 28, x: SCREEN_W / 2 - 15, y: 50, delay: 200, colors: [ICON_COLORS[4], ICON_COLORS[2], ICON_COLORS[0], ICON_COLORS[4]] },
  { icon: "ribbon", size: 24, x: 40, y: 310, delay: 600, colors: [ICON_COLORS[5], ICON_COLORS[1], ICON_COLORS[3], ICON_COLORS[5]] },
  { icon: "school", size: 26, x: SCREEN_W - 75, y: 350, delay: 1000, colors: [ICON_COLORS[0], ICON_COLORS[4], ICON_COLORS[2], ICON_COLORS[0]] },
  { icon: "sparkles", size: 22, x: SCREEN_W / 2 + 30, y: 160, delay: 1200, colors: [ICON_COLORS[1], ICON_COLORS[5], ICON_COLORS[3], ICON_COLORS[1]] },
] as const;

export default function SignupScreen() {
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

  const [sendOTP] = useSendOTPMutation();
  const [verifyOTP] = useVerifyOTPMutation();
  const dispatch = useAppDispatch();

  const handleSendOtp = async (email: string) => {
    await sendOTP({ email }).unwrap();
  };

  const handleSignup = async ({
    name,
    email,
    password,
    otp,
  }: {
    name: string;
    email: string;
    password: string;
    otp: string;
  }) => {
    setLoading(true);
    try {
      let fcmToken: string | undefined;
      try {
        const res = await Notifications.getDevicePushTokenAsync();
        fcmToken = res?.data ?? getStoredFcmToken() ?? undefined;
      } catch {
        fcmToken = getStoredFcmToken() ?? undefined;
      }
      const res = await verifyOTP({ email, otp, name, password, fcmToken }).unwrap();
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

      {/* Back button */}
      <TouchableOpacity
        style={[styles.backBtn, { top: insets.top + 12 }]}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#FFF" />
      </TouchableOpacity>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        // Lets the ScrollView inset itself for the keyboard. A
        // KeyboardAvoidingView nested inside a ScrollView fights this and makes
        // the form jump on every focus change.
        automaticallyAdjustKeyboardInsets
      >
        {/* Top welcome */}
        <View style={[styles.topSpacer, { paddingTop: insets.top + 50 }]}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.welcomeWrap}
          >
            <View style={styles.logoBadge}>
              <Ionicons name="person-add" size={24} color="#A78BFA" />
            </View>
            <Text style={styles.brandText}>Sparks</Text>
            <Text style={styles.welcomeTitle}>Create Account</Text>
            <Text style={styles.welcomeSub}>Join thousands of learners on Sparks</Text>
          </Animated.View>
        </View>

        {/* Form card */}
        <View style={styles.keyboardView}>
          <Animated.View
            style={[styles.formCard, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + 24 }, formAnimatedStyle]}
          >
            {/* Step indicator text */}
            <View style={styles.formHeader}>
              <Text style={[styles.formTitle, { color: theme.colors.textPrimary }]}>
                Get Started
              </Text>
              <Text style={[styles.formSub, { color: theme.colors.textSecondary }]}>
                Follow the steps to create your account
              </Text>
            </View>

            <Signup
              onSignup={handleSignup}
              onSendOtp={handleSendOtp}
              loading={loading}
            />

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                Already have an account?{" "}
              </Text>
              <TextButton
                title="Login"
                onPress={() => router.replace("/(auth)/login")}
              />
            </View>
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
        withTiming(1, { duration: 3500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 3500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    pulse2.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    rotate.value = withRepeat(
      withTiming(360, { duration: 25000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const orb1Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse1.value, [0, 1], [0.12, 0.3]),
    transform: [
      { scale: interpolate(pulse1.value, [0, 1], [0.8, 1.2]) },
      { translateX: interpolate(pulse1.value, [0, 1], [-15, 15]) },
      { translateY: interpolate(pulse1.value, [0, 1], [-10, 10]) },
    ],
  }));

  const orb2Style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse2.value, [0, 1], [0.1, 0.28]),
    transform: [
      { scale: interpolate(pulse2.value, [0, 1], [1, 1.3]) },
      { translateX: interpolate(pulse2.value, [0, 1], [10, -15]) },
      { translateY: interpolate(pulse2.value, [0, 1], [10, -15]) },
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
  // One fixed colour per icon. Cycling it on an interval snapped the colour
  // with no transition, so eight icons on staggered timers read as the whole
  // background blinking — and each tick was a React re-render while typing.
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
  screen: { flex: 1, backgroundColor: "#0F0A2E" },

  /* BG */
  bgTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.48,
    backgroundColor: "#0F0A2E",
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
  },
  orb1: {
    width: 260,
    height: 260,
    top: -50,
    right: -30,
    backgroundColor: "#A78BFA",
  },
  orb2: {
    width: 220,
    height: 220,
    top: 80,
    left: -60,
    backgroundColor: "#FFB300",
  },
  ring: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.06)",
    top: -20,
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
  scrollContent: { flexGrow: 1 },
  keyboardView: { flex: 1 },

  /* TOP WELCOME */
  topSpacer: {
    minHeight: SCREEN_H * 0.32,
    justifyContent: "flex-end",
    paddingHorizontal: 28,
    paddingBottom: 28,
  },
  welcomeWrap: { alignItems: "flex-start" },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(167,139,250,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  brandText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: "#A78BFA",
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
    paddingTop: 28,
    shadowColor: "rgba(0,0,0,0.3)",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  formHeader: {
    marginBottom: 8,
  },
  formTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    marginBottom: 4,
  },
  formSub: {
    fontFamily: fonts.regular,
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
});
