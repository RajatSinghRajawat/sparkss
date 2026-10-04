import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../src/theme";
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetAvatarUploadUrlMutation,
} from "../../src/store";
import { Input } from "../../src/components/common/Input";
import { Button } from "../../src/components/common/Button";

/** Upload local file to S3 presigned URL (works on Android/iOS). */
const uploadFileToS3 = async (
  fileUri: string,
  uploadUrl: string,
  contentType: string
): Promise<void> => {
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    body: bytes,
    headers: { "Content-Type": contentType },
  });
  if (!uploadResponse.ok) {
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }
};

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: profileData, isLoading: loadingProfile } = useGetProfileQuery(undefined, {
    refetchOnFocus: true,
  });
  const profile = profileData?.data;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarKey, setAvatarKey] = useState<string | null>(null);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  /** After upload, S3 URL for preview until profile is refetched */
  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);

  const [updateProfile, { isLoading: updating }] = useUpdateProfileMutation();
  const [getAvatarUploadUrl] = useGetAvatarUploadUrlMutation();

  // Seed the form from the fetched profile once. Re-running this on every
  // refetch (the query uses refetchOnFocus) discarded in-progress edits.
  const [seededEmail, setSeededEmail] = useState<string | null>(null);
  if (profile && profile.email !== seededEmail) {
    setSeededEmail(profile.email);
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow access to photos to change avatar.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    const mime = result.assets[0].mimeType ?? "image/jpeg";
    setLocalAvatarUri(uri);

    try {
      const urlRes = await getAvatarUploadUrl({
        avatarType: mime,
      }).unwrap();
      if (!urlRes.data?.uploadUrl || !urlRes.data?.key) {
        throw new Error("Invalid upload URL response");
      }
      await uploadFileToS3(uri, urlRes.data.uploadUrl, mime);
      setAvatarKey(urlRes.data.key);
      if (urlRes.data.fileUrl) setUploadedAvatarUrl(urlRes.data.fileUrl);
    } catch (e: unknown) {
      // Drop the local preview: keeping it shows the new photo as if it had
      // been saved, while the profile still holds the old one.
      setLocalAvatarUri(null);
      const msg = e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Could not upload photo.";
      Alert.alert("Upload failed", msg);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      Alert.alert("Invalid name", "Name must be at least 2 characters.");
      return;
    }
    const trimmedPhone = phone.trim();
    if (trimmedPhone.length > 0 && !/^\d{10}$/.test(trimmedPhone)) {
      Alert.alert("Invalid phone", "Enter a valid 10-digit phone number or leave empty.");
      return;
    }

    try {
      await updateProfile({
        name: trimmedName,
        ...(trimmedPhone !== "" ? { phone: trimmedPhone } : { phone: "" }),
        ...(avatarKey ? { avatarKey } : {}),
      }).unwrap();
      Alert.alert("Saved", "Profile updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      const res = e as { data?: { message?: string }; message?: string };
      const msg = res?.data?.message ?? res?.message ?? "Failed to update profile.";
      Alert.alert("Error", msg);
    }
  };

  if (loadingProfile && !profile) {
    return (
      <View
        style={[
          styles.screen,
          styles.centered,
          { paddingTop: insets.top, backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  const avatarUri =
    localAvatarUri ?? uploadedAvatarUrl ?? (avatarKey ? undefined : profile?.image ?? undefined);

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
          Edit Profile
        </Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={updating}
          style={styles.saveBtn}
        >
          {updating ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Text style={[styles.saveBtnText, { color: theme.colors.primary }]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
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
        <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="camera" size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.avatarHint, { color: theme.colors.textSecondary }]}>
                Tap to add photo
              </Text>
            </View>
          )}
          <View style={[styles.avatarEditBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="camera" size={18} color="#FFF" />
          </View>
        </TouchableOpacity>

        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoCapitalize="words"
          maxLength={50}
          containerStyle={styles.field}
        />

        <Input
          label="Email"
          value={profile?.email ?? ""}
          editable={false}
          placeholder="Email"
          containerStyle={styles.field}
        />
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          Email cannot be changed
        </Text>

        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="10-digit phone number (optional)"
          keyboardType="phone-pad"
          maxLength={10}
          containerStyle={styles.field}
        />

        <Button
          title="Save changes"
          onPress={handleSave}
          loading={updating}
          disabled={updating}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 12,
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
  saveBtn: { minWidth: 56, alignItems: "flex-end" },
  saveBtnText: { fontFamily: fonts.semiBold, fontSize: 16 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  avatarWrap: {
    alignSelf: "center",
    marginBottom: 28,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  avatarHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4,
  },
  avatarEditBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { marginBottom: 4 },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 16,
    marginLeft: 4,
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 24,
  },
});
