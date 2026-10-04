import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import * as ImagePickerExpo from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface ImagePickerProps {
  imageUri?: string;
  onPick: (uri: string) => void;
  onError?: (error: Error) => void;
  label?: string;
  allowEditing?: boolean;
  aspect?: [number, number];
}

export function ImagePicker({
  imageUri,
  onPick,
  onError,
  label,
  allowEditing = true,
  aspect = [1, 1],
}: ImagePickerProps) {
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePickerExpo.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        onError?.(new Error("Permission denied"));
        return;
      }

      const result = await ImagePickerExpo.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: allowEditing,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onPick(result.assets[0].uri);
      }
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
          {label}
        </Text>
      )}
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={pickImage}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <>
            <Ionicons
              name="image-outline"
              size={48}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.triggerText, { color: theme.colors.textSecondary }]}
            >
              Tap to select image
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    marginBottom: 8,
  },
  trigger: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
  triggerText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 8,
  },
});
