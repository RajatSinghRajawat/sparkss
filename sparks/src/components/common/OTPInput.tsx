import React, { useCallback, useRef, useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { theme , fonts } from "../../theme";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
}: OTPInputProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const toBoxes = useCallback(
    (v: string) => v.split("").concat(Array(length).fill("")).slice(0, length),
    [length]
  );

  /**
   * The boxes are their own state rather than a split of `value`. Clearing a
   * middle digit leaves a gap that `join("")` collapses, so deriving the boxes
   * from the joined string shifted every later digit one box to the left.
   */
  const [digits, setDigits] = useState<string[]>(() => toBoxes(value));

  // Follow the parent when it replaces the value outright (e.g. Resend OTP
  // clears it). Adjusting during render rather than in an effect avoids a
  // second commit; comparing the joined form first keeps the gaps held here.
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    if (digits.join("") !== value) setDigits(toBoxes(value));
  }

  const commit = (next: string[]) => {
    setDigits(next);
    const joined = next.join("");
    onChange(joined);
    if (next.every((d) => d !== "")) {
      onComplete?.(joined);
      return true;
    }
    return false;
  };

  const handleChange = (text: string, index: number) => {
    const clean = text.replace(/\D/g, "");

    if (clean.length > 1) {
      const next = [...digits];
      clean
        .slice(0, length - index)
        .split("")
        .forEach((char, i) => {
          next[index + i] = char;
        });
      if (commit(next)) inputRefs.current[length - 1]?.blur();
      else inputRefs.current[Math.min(index + clean.length, length - 1)]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean.slice(-1);
    if (commit(next)) inputRefs.current[index]?.blur();
    else if (clean) inputRefs.current[Math.min(index + 1, length - 1)]?.focus();
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      commit(next);
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
              inputRefs.current[index] = ref;
            }}
          style={[
            styles.box,
            {
              backgroundColor: theme.colors.surface,
              borderColor:
                focusedIndex === index ? theme.colors.primary : theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          keyboardType="number-pad"
          maxLength={index === 0 ? length : 1}
          selectTextOnFocus
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  box: {
    width: 44,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    fontFamily: fonts.bold,
    fontSize: 20,
    textAlign: "center",
  },
});
