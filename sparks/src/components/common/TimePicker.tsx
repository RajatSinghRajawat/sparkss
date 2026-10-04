import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform , StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface TimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
}

export function TimePicker({
  value,
  onChange,
  label,
  placeholder = "Select time",
}: TimePickerProps) {
  const [show, setShow] = useState(false);
  const displayTime = value
    ? value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : placeholder;

  const handleChange = (_: unknown, selectedDate?: Date) => {
    setShow(Platform.OS === "ios");
    if (selectedDate) onChange(selectedDate);
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
        onPress={() => setShow(true)}
      >
        <Ionicons
          name="time-outline"
          size={20}
          color={theme.colors.textSecondary}
        />
        <Text
          style={[
            styles.triggerText,
            {
              color: value
                ? theme.colors.textPrimary
                : theme.colors.textSecondary,
            },
          ]}
        >
          {displayTime}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          accentColor={theme.colors.primary}
        />
      )}
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
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  triggerText: {
    fontFamily: fonts.regular,
    fontSize: 16,
    flex: 1,
  },
});
