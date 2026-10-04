import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => canGoPrev && onPageChange(currentPage - 1)}
        disabled={!canGoPrev}
        style={[styles.button, !canGoPrev && styles.disabled]}
      >
        <Ionicons
          name="chevron-back"
          size={24}
          color={canGoPrev ? theme.colors.primary : theme.colors.textSecondary}
        />
      </TouchableOpacity>
      <Text style={[styles.text, { color: theme.colors.textPrimary }]}>
        {currentPage} / {totalPages}
      </Text>
      <TouchableOpacity
        onPress={() => canGoNext && onPageChange(currentPage + 1)}
        disabled={!canGoNext}
        style={[styles.button, !canGoNext && styles.disabled]}
      >
        <Ionicons
          name="chevron-forward"
          size={24}
          color={canGoNext ? theme.colors.primary : theme.colors.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  button: {
    padding: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
});
