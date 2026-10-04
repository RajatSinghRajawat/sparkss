import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../../../src/theme";
import { useGetStudentTestResultQuery } from "../../../../src/store";
import { BannerAd, useInterstitialAd } from "../../../../src/components/ads";
import type { TestQuestionOption , ResultAnswer } from "../../../../src/types/test.types";

function OptionRow({
  label,
  text,
  variant,
}: {
  label: string;
  text: string;
  variant: "default" | "correct" | "wrong";
}) {
  const bg =
    variant === "correct"
      ? theme.colors.success + "18"
      : variant === "wrong"
      ? theme.colors.error + "18"
      : theme.colors.surface;
  const borderColor =
    variant === "correct"
      ? theme.colors.success
      : variant === "wrong"
      ? theme.colors.error
      : theme.colors.border;
  const textColor =
    variant === "correct"
      ? theme.colors.success
      : variant === "wrong"
      ? theme.colors.error
      : theme.colors.textPrimary;

  return (
    <View style={[styles.optionRow, { backgroundColor: bg, borderColor }]}>
      <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
      <Text style={[styles.optionText, { color: textColor }]} numberOfLines={2}>
        {text}
      </Text>
      {variant !== "default" && (
        <Ionicons
          name={variant === "correct" ? "checkmark-circle" : "close-circle"}
          size={22}
          color={textColor}
          style={styles.optionIcon}
        />
      )}
    </View>
  );
}

function QuestionBlock({
  question,
  questionIndex,
  answer,
}: {
  question: TestQuestionOption;
  questionIndex: number;
  answer: ResultAnswer;
}) {
  const options = question?.options ?? [];
  const userSelected = answer.userSelectedOption;
  const correctOption = answer.correctOption;
  const isCorrect = answer.isCorrect;

  return (
    <View style={[styles.questionBlock, { backgroundColor: theme.colors.card }]}>
      <View style={styles.questionHeader}>
        <Text style={[styles.questionNumber, { color: theme.colors.primary }]}>
          Q{questionIndex + 1}
        </Text>
        <Text style={[styles.questionText, { color: theme.colors.textPrimary }]}>
          {question?.questionText ?? ""}
        </Text>
      </View>
      <View style={styles.optionsContainer}>
        {options.map((opt, idx) => {
          const isUserChoice = idx === userSelected;
          const isCorrectOption = idx === correctOption;
          let variant: "default" | "correct" | "wrong" = "default";
          if (isUserChoice && isCorrect) variant = "correct";
          else if (isUserChoice && !isCorrect) variant = "wrong";
          else if (isCorrectOption && !isUserChoice) variant = "correct"; // show correct answer user didn't pick

          return (
            <OptionRow
              key={idx}
              label={String.fromCharCode(65 + idx)}
              text={opt}
              variant={variant}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function QuizResultScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showInterstitialAd } = useInterstitialAd();
  const interstitialShown = useRef(false);

  const { data, isLoading, isError, error } = useGetStudentTestResultQuery(
    testId ?? "",
    { skip: !testId }
  );

  const payload = data?.data;
  const test = payload?.test;
  const result = payload?.result;

  // Must be called unconditionally (Rules of Hooks); run interstitial only when we have valid result
  useEffect(() => {
    if (!payload || !test || !result || interstitialShown.current) return;
    interstitialShown.current = true;
    const t = setTimeout(() => showInterstitialAd(), 1500);
    return () => clearTimeout(t);
  }, [payload, test, result, showInterstitialAd]);

  if (!testId) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>Missing test ID</Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.colors.buttonText }]}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Checked before the loading branch: a failed request also leaves `payload`
  // undefined, so testing that first would spin forever instead of reporting.
  if (isError) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {(error as any)?.data?.message ?? "Could not load result. Complete the test first."}
        </Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.colors.buttonText }]}>Back to Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading || !payload) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading result...</Text>
      </View>
    );
  }

  if (!test || !result) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {(error as any)?.data?.message ?? "Could not load result. Complete the test first."}
        </Text>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.colors.primary }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: theme.colors.buttonText }]}>Back to Quiz</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const questions = test.questions ?? [];
  const answers = result.answers ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {test.title}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.summaryCard, { backgroundColor: theme.colors.primary + "15", borderColor: theme.colors.primary + "40" }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>{result.correctCount}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Correct</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="close-circle" size={28} color={theme.colors.error} />
              <Text style={[styles.summaryValue, { color: theme.colors.textPrimary }]}>{result.wrongCount}</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Wrong</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="ribbon" size={28} color={theme.colors.primary} />
              <Text style={[styles.summaryValue, { color: theme.colors.primary }]}>{result.scorePercent}%</Text>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Score</Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Answers</Text>
        {answers.map((answer) => {
          const question = questions[answer.questionNumber];
          if (!question) return null;
          return (
            <QuestionBlock
              key={answer.questionNumber}
              question={question}
              questionIndex={answer.questionNumber}
              answer={answer}
            />
          );
        })}
        <View style={styles.bannerAdWrap}>
          <BannerAd />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerBack: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontFamily: fonts.semiBold, fontSize: 18, flex: 1, textAlign: "center" },
  headerPlaceholder: { width: 40 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  summaryItem: { alignItems: "center", gap: 4 },
  summaryValue: { fontFamily: fonts.bold, fontSize: 22 },
  summaryLabel: { fontFamily: fonts.regular, fontSize: 12 },
  sectionTitle: { fontFamily: fonts.semiBold, fontSize: 16, marginBottom: 12 },
  bannerAdWrap: { alignItems: "center", paddingVertical: 20 },
  questionBlock: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  questionHeader: { marginBottom: 12 },
  questionNumber: { fontFamily: fonts.semiBold, fontSize: 13, marginBottom: 4 },
  questionText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  optionsContainer: { gap: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 10,
  },
  optionLabel: { fontFamily: fonts.bold, fontSize: 14, width: 24 },
  optionText: { fontFamily: fonts.regular, fontSize: 14, flex: 1 },
  optionIcon: { marginLeft: "auto" },
  loadingText: { fontFamily: fonts.regular, fontSize: 14, marginTop: 12 },
  errorText: { fontFamily: fonts.semiBold, fontSize: 14, textAlign: "center", marginTop: 12 },
  backBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { fontFamily: fonts.semiBold, fontSize: 15 },
});
