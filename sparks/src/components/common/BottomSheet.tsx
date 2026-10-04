import React from "react";
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number | string;
}

export function BottomSheet({
  visible,
  onClose,
  children,
  height = "50%",
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const sheetHeight =
    typeof height === "string"
      ? (SCREEN_HEIGHT * parseInt(height, 10)) / 100
      : height;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  height: sheetHeight,
                  backgroundColor: theme.colors.background,
                  paddingBottom: insets.bottom,
                },
              ]}
            >
              <View style={styles.handle} />
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
              <View style={styles.content}>{children}</View>
            </View>
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
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    alignSelf: "center",
    marginTop: 12,
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 24,
    zIndex: 1,
  },
  content: {
    flex: 1,
    marginTop: 24,
  },
});
