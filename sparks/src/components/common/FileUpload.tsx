import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface FileUploadProps {
  onPick: (file: DocumentPicker.DocumentPickerAsset) => void;
  onError?: (error: Error) => void;
  label?: string;
  accept?: string[];
  multiple?: boolean;
}

export function FileUpload({
  onPick,
  onError,
  label,
  accept,
  multiple = false,
}: FileUploadProps) {
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: accept && accept.length > 0 ? accept : "*/*",
        copyToCacheDirectory: true,
        multiple,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (file) onPick(file);
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
        onPress={pickFile}
      >
        <Ionicons
          name="document-attach-outline"
          size={24}
          color={theme.colors.textSecondary}
        />
        <Text style={[styles.triggerText, { color: theme.colors.textSecondary }]}>
          Tap to upload file
        </Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  triggerText: {
    fontFamily: fonts.regular,
    fontSize: 16,
  },
});
