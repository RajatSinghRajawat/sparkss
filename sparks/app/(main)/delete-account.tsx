import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../src/theme";
import {
  useGetProfileQuery,
  useRequestDeleteAccountMutation,
  useAppDispatch,
  logout,
  clearAuthStorage,
} from "../../src/store";
import { Input } from "../../src/components/common/Input";
import { Button } from "../../src/components/common/Button";

const MAX_MESSAGE = 500;

export default function DeleteAccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const { data: profileData } = useGetProfileQuery(undefined, { refetchOnFocus: true });
  const profile = profileData?.data;
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  // Prefill once; a refocus refetch must not overwrite a hand-typed address.
  const [seededEmail, setSeededEmail] = useState<string | null>(null);
  if (profile?.email && profile.email !== seededEmail) {
    setSeededEmail(profile.email);
    setEmail(profile.email);
  }

  const [requestDeleteAccount, { isLoading }] = useRequestDeleteAccountMutation();

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail) {
      Alert.alert("Required", "Enter your account email.");
      return;
    }
    if (!trimmedMessage) {
      Alert.alert("Required", "Please tell us why you are leaving (reason or message).");
      return;
    }
    if (trimmedMessage.length > MAX_MESSAGE) {
      Alert.alert("Too long", `Message must be at most ${MAX_MESSAGE} characters.`);
      return;
    }
    if (profile?.email && trimmedEmail.toLowerCase() !== profile.email.toLowerCase()) {
      Alert.alert("Email mismatch", "The email you entered does not match your account email.");
      return;
    }

    Alert.alert(
      "Delete account?",
      "Your account will be deactivated. You will not be able to log in again. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete my account",
          style: "destructive",
          onPress: async () => {
            try {
              await requestDeleteAccount({
                email: trimmedEmail,
                message: trimmedMessage,
              }).unwrap();
              await clearAuthStorage();
              dispatch(logout());
              Alert.alert(
                "Account deactivated",
                "Your account has been deactivated. We have recorded your feedback.",
                [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
              );
            } catch (e: unknown) {
              const res = e as { data?: { message?: string }; message?: string };
              const msg = res?.data?.message ?? res?.message ?? "Failed to process request.";
              Alert.alert("Error", msg);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Delete Account
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.warnBox, { backgroundColor: theme.colors.error + "14", borderColor: theme.colors.error + "40" }]}>
          <Ionicons name="warning-outline" size={24} color={theme.colors.error} />
          <Text style={[styles.warnText, { color: theme.colors.textPrimary }]}>
            This will deactivate your account. You will not be able to log in again. Your feedback will be stored for our records.
          </Text>
        </View>

        <Input
          label="Confirm your email"
          value={email}
          onChangeText={setEmail}
          placeholder="Your account email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.field}
          editable={!isLoading}
        />

        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          Why are you leaving? (optional but helpful)
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          placeholder="Your message or reason (max 500 characters)"
          placeholderTextColor={theme.colors.textSecondary}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={MAX_MESSAGE}
          editable={!isLoading}
        />
        <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
          {message.length} / {MAX_MESSAGE}
        </Text>

        <Button
          title={isLoading ? "Processing…" : "Delete my account"}
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
          style={[styles.deleteBtn, { backgroundColor: theme.colors.error }]}
          textStyle={{ color: "#FFF" }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  headerRight: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  warnText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  field: { marginBottom: 16 },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginBottom: 8,
  },
  textArea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlignVertical: "top",
  },
  charCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 24,
  },
  deleteBtn: { marginTop: 8 },
});
