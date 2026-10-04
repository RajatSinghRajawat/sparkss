import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ModalWrapper } from "./ModalWrapper";
import { Button } from "./Button";
import { TextButton } from "./TextButton";
import { theme , fonts } from "../../theme";

interface AlertDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  variant?: "default" | "danger";
}

export function AlertDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "default",
}: AlertDialogProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <ModalWrapper visible={visible} onClose={onClose}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {title}
      </Text>
      {message && (
        <Text
          style={[styles.message, { color: theme.colors.textSecondary }]}
        >
          {message}
        </Text>
      )}
      <View style={styles.actions}>
        <TextButton
          title={cancelLabel}
          onPress={onClose}
          style={styles.cancel}
        />
        <Button
          title={confirmLabel}
          onPress={handleConfirm}
          variant="primary"
          style={
            variant === "danger"
              ? [styles.confirm, { backgroundColor: theme.colors.error }]
              : styles.confirm
          }
        />
      </View>
    </ModalWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
  },
  message: {
    fontFamily: fonts.regular,
    fontSize: 15,
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
  cancel: {},
  confirm: {},
});
