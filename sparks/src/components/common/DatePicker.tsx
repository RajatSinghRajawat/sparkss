import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform , StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { theme , fonts } from "../../theme";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  label?: string;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  minimumDate,
  maximumDate,
}: DatePickerProps) {
  const [show, setShow] = useState(false);
  const displayDate = value
    ? value.toLocaleDateString()
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
          name="calendar-outline"
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
          {displayDate}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
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
