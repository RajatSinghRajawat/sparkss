import React from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { theme } from "../../theme";

interface ModalWrapperProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  transparent?: boolean;
}

export function ModalWrapper({
  visible,
  onClose,
  children,
  transparent = true,
}: ModalWrapperProps) {
  return (
    <Modal
      visible={visible}
      transparent={transparent}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.content}
            >
              <View
                style={[
                  styles.box,
                  { backgroundColor: theme.colors.background },
                ]}
              >
                {children}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 400,
  },
  box: {
    borderRadius: 16,
    padding: 24,
  },
});
