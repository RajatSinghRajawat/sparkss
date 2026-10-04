import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../src/theme";
import { useChangePasswordMutation } from "../../src/store";
import { PasswordInput } from "../../src/components/common/PasswordInput";
import { Button } from "../../src/components/common/Button";

const NEW_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const handleSubmit = async () => {
    const current = currentPassword.trim();
    const newP = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!current) {
      Alert.alert("Required", "Enter your current password.");
      return;
    }
    if (newP.length < 6) {
      Alert.alert("Invalid password", "New password must be at least 6 characters.");
      return;
    }
    if (!NEW_PASSWORD_REGEX.test(newP)) {
      Alert.alert(
        "Invalid password",
        "New password must contain at least one uppercase letter, one lowercase letter, and one number."
      );
      return;
    }
    if (newP !== confirm) {
      Alert.alert("Mismatch", "New password and confirm password do not match.");
      return;
    }
    if (current === newP) {
      Alert.alert("Same password", "New password must be different from current password.");
      return;
    }

    try {
      await changePassword({
        currentPassword: current,
        newPassword: newP,
      }).unwrap();
      Alert.alert("Success", "Your password has been changed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const res = e as { data?: { message?: string }; message?: string };
      const msg =
        res?.data?.message ?? res?.message ?? "Failed to change password.";
      Alert.alert("Error", msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.background,
        },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Change Password
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Enter your current password and choose a new one. Use at least 6 characters with uppercase, lowercase, and a number.
        </Text>

        <PasswordInput
          label="Current password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          containerStyle={styles.field}
        />

        <PasswordInput
          label="New password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          containerStyle={styles.field}
        />

        <PasswordInput
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm new password"
          containerStyle={styles.field}
        />

        <Button
          title="Change password"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
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
  headerRight: { width: 56 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  field: { marginBottom: 4 },
  submitButton: {
    marginTop: 24,
    marginBottom: 24,
  },
});
