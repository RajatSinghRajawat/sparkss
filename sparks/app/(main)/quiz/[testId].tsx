import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../../src/theme";
import { useGetStudentTestByIdQuery, useAppSelector, getToken, useSubmitAnswerMutation, useCompleteQuizMutation } from "../../../src/store";
import { getSocket, type TestJoinedResponse } from "../../../src/services/socket";
import type { TestFromApi } from "../../../src/types/test.types";

const EXPIRED_MSG = "Quiz expired. Next time play quiz.";

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return "0:00";
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatStartTime(isoString: string | null | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const dateStr = isToday ? "Today" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return isoString;
  }
}

export default function QuizPlayScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const socketStatus = useAppSelector((s) => s.socket?.status ?? "disconnected");
  const [joinStatus, setJoinStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [status, setStatus] = useState<"countdown" | "started" | "expired">("countdown");
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [expired, setExpired] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [scoreResult, setScoreResult] = useState<{ correctCount: number; total: number; scorePercent: number } | null>(null);
  const [answeredCurrentQuestion, setAnsweredCurrentQuestion] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [socketStartTime, setSocketStartTime] = useState<string | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsLeftRef = useRef(0);
  const completingRef = useRef(false);

  const [submitAnswer, { isLoading: isSubmitting }] = useSubmitAnswerMutation();
  const [completeQuiz, { isLoading: isCompleting }] = useCompleteQuizMutation();

  const { data: testData, isLoading: testLoading, isError: testError } = useGetStudentTestByIdQuery(
    testId ?? "",
    { skip: !testId }
  );
  const test = testData?.data?.test;

  useEffect(() => {
    if (!testId) return;

    const tokenPromise = getToken();
    // This effect re-runs on every socket reconnect. Once joined, keep the
    // quiz on screen and just re-join quietly — it used to flash back to
    // "Joining quiz..." while the question timer kept running.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors socket.io connection state into React.
    setJoinStatus((prev) => (prev === "joined" ? prev : "joining"));

    const tryJoin = (socket: NonNullable<ReturnType<typeof getSocket>>) => {
      tokenPromise.then((token) => {
        if (!token) {
          setJoinStatus("error");
          setJoinError("Not authorized. Please login.");
          return;
        }
        socket.emit("test:join", { testId, token }, (res: TestJoinedResponse) => {
          if (res?.success) {
            setJoinStatus("joined");
            setStatus(res.status ?? "countdown");
            if (res.startTime) setSocketStartTime(res.startTime);
            if (res.status === "started") setCountdownSeconds(0);
          } else {
            setJoinStatus("error");
            if (res?.reason === "expired" || res?.message?.toLowerCase().includes("expired")) {
              setExpired(true);
              setJoinError(EXPIRED_MSG);
            } else {
              setJoinError(res?.message ?? "Could not join test.");
            }
          }
        });
      });
    };

    const socket = getSocket();
    let onConnect: (() => void) | null = null;
    let onConnectError: (() => void) | null = null;
    if (socket?.connected) {
      tryJoin(socket);
    } else if (socket) {
      onConnect = () => tryJoin(socket);
      onConnectError = () => {
        // Message is only shown in the error state, so setting it is harmless
        // when we stay joined.
        setJoinError("Connection failed. Check your network.");
        setJoinStatus((prev) => (prev === "joined" ? prev : "error"));
      };
      socket.once("connect", onConnect);
      socket.on("connect_error", onConnectError);
    } else {
      if (socketStatus === "error" || socketStatus === "disconnected") {
        setJoinStatus("error");
        setJoinError("Socket not connected. Please try again.");
      }
    }

    const s = socket;
    const onStart = () => {
      setStatus("started");
      setCountdownSeconds(0);
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
    const onExpired = () => {
      setExpired(true);
      setStatus("expired");
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
    s?.on("test:start", onStart);
    s?.on("test:expired", onExpired);

    return () => {
      // The countdown interval is cleared on unmount (effect below), not here:
      // clearing it on a reconnect re-run stopped the countdown for good.
      s?.off("test:start", onStart);
      s?.off("test:expired", onExpired);
      if (onConnect) socket?.off("connect", onConnect);
      if (onConnectError) socket?.off("connect_error", onConnectError);
    };
  }, [testId, socketStatus]);

  useEffect(
    () => () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    },
    []
  );

  // Countdown tick when status is countdown and we have startTime
  useEffect(() => {
    if (status !== "countdown" || !socketStartTime || joinStatus !== "joined") return;

    const tick = () => {
      const start = new Date(socketStartTime).getTime();
      const now = Date.now();
      const left = Math.max(0, Math.ceil((start - now) / 1000));
      setCountdownSeconds(left);
      if (left <= 0 && countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setStatus("started");
      }
    };

    tick();
    countdownIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [status, joinStatus, socketStartTime]);

  const questions = test?.questions ?? [];
  const totalQuestions = questions.length;
  const perQuestionSeconds = (test?.perQuestionMinutes ?? 0) * 60 + (test?.perQuestionSeconds ?? 0) || 30;
  const currentQuestionIndexRef = useRef(0);
  const totalQuestionsRef = useRef(0);
  useEffect(() => {
    currentQuestionIndexRef.current = currentQuestionIndex;
    totalQuestionsRef.current = totalQuestions;
  }, [currentQuestionIndex, totalQuestions]);

  const handleQuizComplete = async () => {
    if (questionTimerRef.current) {
      clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
    }
    if (!testId || completingRef.current) return;
    completingRef.current = true;
    try {
      const res = await completeQuiz(testId).unwrap();
      if (res?.data) {
        setScoreResult({
          correctCount: res.data.correctCount,
          total: res.data.total,
          scorePercent: res.data.scorePercent,
        });
      }
      setQuizComplete(true);
    } catch {
      setQuizComplete(true);
    }
  };

  useEffect(() => {
    if (status !== "started" || totalQuestions === 0 || quizComplete) return;
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds the countdown for the interval below.
    setQuestionTimeLeft(perQuestionSeconds);
    setAnsweredCurrentQuestion(false);
    setSelectedOptionIndex(null);
    secondsLeftRef.current = perQuestionSeconds;
    // Advancing/submitting happens here rather than inside a setState updater:
    // React may call an updater more than once, which would submit the quiz twice.
    questionTimerRef.current = setInterval(() => {
      const left = secondsLeftRef.current - 1;
      secondsLeftRef.current = left;
      setQuestionTimeLeft(left > 0 ? left : 0);
      if (left > 0) return;

      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      questionTimerRef.current = null;
      const idx = currentQuestionIndexRef.current;
      const total = totalQuestionsRef.current;
      if (idx + 1 < total) {
        setCurrentQuestionIndex(idx + 1);
      } else {
        handleQuizComplete();
      }
    }, 1000);
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [status, currentQuestionIndex, totalQuestions, quizComplete, perQuestionSeconds]);

  const handleSelectOption = async (optionIndex: number) => {
    if (!testId || isSubmitting || answeredCurrentQuestion) return;
    setSelectedOptionIndex(optionIndex);
    try {
      await submitAnswer({
        testId,
        questionNumber: currentQuestionIndex,
        selectedOption: optionIndex,
      }).unwrap();
      setAnsweredCurrentQuestion(true);
    } catch {
      // keep timer running, user can try again
      setSelectedOptionIndex(null);
    }
  };

  if (!testId) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>Invalid test</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Checked before the loading branch: on a failed fetch `test` is undefined
  // too, so testing `!test` first would leave the spinner up forever.
  if (testError) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>Failed to load test</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: theme.colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (testLoading || !test) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading test...</Text>
      </View>
    );
  }

  if (joinStatus === "error" || expired) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnIcon}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.expiredBlock}>
          <View style={[styles.expiredIconWrap, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="time-outline" size={56} color={theme.colors.error} />
          </View>
          <Text style={[styles.expiredTitle, { color: theme.colors.textPrimary }]}>
            {EXPIRED_MSG}
          </Text>
          <Text style={[styles.expiredSub, { color: theme.colors.textSecondary }]}>
            {joinError ?? "This quiz is no longer available."}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnText}>Back to Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (joinStatus === "joining" || joinStatus === "idle") {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Joining quiz...</Text>
      </View>
    );
  }

  // Countdown: show "Starts in MM:SS" until start
  if (status === "countdown" && countdownSeconds > 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnIcon}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.countdownBlock}>
          <Text style={[styles.countdownLabel, { color: theme.colors.textSecondary }]}>
            Quiz starts in
          </Text>
          <Text style={[styles.countdownValue, { color: theme.colors.primary }]}>
            {formatCountdown(countdownSeconds)}
          </Text>
          <Text style={[styles.countdownTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {test.title}
          </Text>
          <Text style={[styles.startTimeText, { color: theme.colors.textSecondary }]}>
            Test starts at {formatStartTime(socketStartTime ?? test.startTime)}
          </Text>
        </View>
      </View>
    );
  }

  // If quiz expired while playing, show expired message
  if (expired || status === "expired") {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnIcon}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.expiredBlock}>
          <View style={[styles.expiredIconWrap, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="time-outline" size={56} color={theme.colors.error} />
          </View>
          <Text style={[styles.expiredTitle, { color: theme.colors.textPrimary }]}>
            {EXPIRED_MSG}
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnText}>Back to Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Result screen after quiz complete
  if (quizComplete) {
    const correct = scoreResult?.correctCount ?? 0;
    const total = scoreResult?.total ?? totalQuestions;
    const percent = scoreResult?.scorePercent ?? 0;
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtnIcon}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.expiredBlock}>
          <View style={[styles.expiredIconWrap, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="trophy" size={56} color={theme.colors.primary} />
          </View>
          <Text style={[styles.expiredTitle, { color: theme.colors.textPrimary }]}>
            Quiz submitted
          </Text>
          <Text style={[styles.expiredSub, { color: theme.colors.textSecondary }]}>
            {correct} / {total} correct ({percent}%)
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryBtnText}>Back to Quiz</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // One question at a time with timer
  const question = questions[currentQuestionIndex];
  if (!question) {
    return (
      <View style={[styles.center, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnIcon}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {test.title}
        </Text>
        <View style={[styles.timerBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.timerBadgeText}>{formatCountdown(questionTimeLeft)}</Text>
        </View>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.questionsHead, { color: theme.colors.textSecondary }]}>
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </Text>
        <View style={[styles.questionCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.questionText, { color: theme.colors.textPrimary }]}>
            {question.questionText}
          </Text>
          <View style={styles.optionsWrap}>
            {(question.options ?? []).map((opt, oi) => {
              const isSelected = selectedOptionIndex === oi;
              return (
                <TouchableOpacity
                  key={oi}
                  style={[
                    styles.optionRow,
                    { borderColor: isSelected ? theme.colors.primary : theme.colors.border },
                    isSelected && styles.optionRowSelected,
                  ]}
                  onPress={() => handleSelectOption(oi)}
                  disabled={isSubmitting || answeredCurrentQuestion}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: isSelected ? theme.colors.primary : theme.colors.textPrimary },
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontFamily: fonts.regular, fontSize: 14, marginTop: 12 },
  errorText: { fontFamily: fonts.semiBold, fontSize: 16 },
  backBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  backBtnText: { fontFamily: fonts.semiBold, fontSize: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnIcon: { padding: 4, marginRight: 8 },
  screenTitle: { flex: 1, fontFamily: fonts.semiBold, fontSize: 18 },
  timerBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  timerBadgeText: { fontFamily: fonts.bold, fontSize: 14, color: "#FFFFFF" },
  expiredBlock: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  expiredIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  expiredTitle: { fontFamily: fonts.bold, fontSize: 20, textAlign: "center", marginBottom: 8 },
  expiredSub: { fontFamily: fonts.regular, fontSize: 14, textAlign: "center", marginBottom: 24 },
  countdownBlock: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  countdownLabel: { fontFamily: fonts.regular, fontSize: 14, marginBottom: 8 },
  countdownValue: { fontFamily: fonts.bold, fontSize: 48, marginBottom: 16 },
  countdownTitle: { fontFamily: fonts.semiBold, fontSize: 18, textAlign: "center" },
  startTimeText: { fontFamily: fonts.regular, fontSize: 14, marginTop: 12, textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  questionsHead: { fontFamily: fonts.regular, fontSize: 14, marginBottom: 12 },
  questionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  questionText: { fontFamily: fonts.semiBold, fontSize: 16, marginBottom: 12 },
  optionsWrap: { gap: 8 },
  optionRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  optionRowSelected: { borderWidth: 2 },
  optionText: { fontFamily: fonts.regular, fontSize: 14 },
  optionTextSelected: { fontFamily: fonts.semiBold },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontFamily: fonts.semiBold, fontSize: 16, color: "#FFFFFF" },
});
