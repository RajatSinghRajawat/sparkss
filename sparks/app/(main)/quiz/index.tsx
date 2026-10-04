import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme , fonts } from "../../../src/theme";

import {
  useGetStudentTestsQuery,
  useToggleTestNotificationMutation,
} from "../../../src/store";
import type { TestFromApi } from "../../../src/types/test.types";

const { width: SCREEN_W } = Dimensions.get("window");

const PAGE_SIZE = 5;

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string }> = {
  Easy: { bg: "#22C55E20", text: "#22C55E" },
  Medium: { bg: "#FFB30020", text: "#FFB300" },
  Hard: { bg: "#EF444420", text: "#EF4444" },
};

/** Display shape for quiz card (API doesn't send difficulty/category/score) */
interface QuizDisplay {
  id: string;
  title: string;
  questions: number;
  duration: string;
  category: string;
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
  score?: number;
  startTime?: string;
  notifySubscribed?: boolean;
}

const JOIN_WINDOW_MINUTES = 5;

function formatStartTime(isoString: string | undefined): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const today = new Date();
    const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const dateStr = isToday ? "Today" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    return `${dateStr} at ${timeStr}`;
  } catch {
    return "";
  }
}

/** Start button is active only from 5 min before test start time. */
function isStartEnabled(startTime: string | undefined): boolean {
  if (!startTime) return true;
  try {
    const start = new Date(startTime).getTime();
    const joinOpenAt = start - JOIN_WINDOW_MINUTES * 60 * 1000;
    return Date.now() >= joinOpenAt;
  } catch {
    return true;
  }
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds >= 60) {
    const min = Math.floor(totalSeconds / 60);
    return `${min} min`;
  }
  return `${totalSeconds} sec`;
}

function testToDisplay(t: TestFromApi): QuizDisplay {
  const count = t.questions?.length ?? 0;
  const perQ = (t.perQuestionMinutes ?? 0) * 60 + (t.perQuestionSeconds ?? 0);
  const totalSeconds = count * (perQ || 30);
  return {
    id: t._id,
    title: t.title ?? "Quiz",
    questions: count,
    duration: formatDuration(totalSeconds),
    category: "Quiz",
    difficulty: "Medium",
    icon: "document-text",
    score: undefined,
    startTime: t.startTime,
    notifySubscribed: t.isNotifySubscribed,
  };
}

export default function QuizListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"today" | "complete">("today");
  const [todayPage, setTodayPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [todayList, setTodayList] = useState<TestFromApi[]>([]);
  const [completedList, setCompletedList] = useState<TestFromApi[]>([]);
  const lastTodayPageRef = useRef(0);
  const lastCompletedPageRef = useRef(0);

  const typeToday = "today" as const;
  const typeCompleted = "my_completed" as const;

  const [refreshing, setRefreshing] = useState(false);
  const {
    data: todayData,
    isFetching: todayFetching,
    refetch: refetchToday,
  } = useGetStudentTestsQuery(
    { type: typeToday, page: todayPage, limit: PAGE_SIZE },
    { refetchOnMountOrArgChange: false }
  );
  const {
    data: completedData,
    isFetching: completedFetching,
    refetch: refetchCompleted,
  } = useGetStudentTestsQuery(
    { type: typeCompleted, page: completedPage, limit: PAGE_SIZE },
    { refetchOnMountOrArgChange: false, skip: activeTab === "today" && completedPage > 1 }
  );

  const todayFromApi = useMemo(() => todayData?.data?.tests ?? [], [todayData]);
  const completedFromApi = useMemo(
    () => completedData?.data?.tests ?? [],
    [completedData]
  );
  const todayPagination = todayData?.data?.pagination;
  const completedPagination = completedData?.data?.pagination;

  useEffect(() => {
    if (todayPage === 1) {
      // Accumulates paged API results; todayFromApi is memoized, so re-setting
      // an unchanged page is a no-op rather than a render loop.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
      setTodayList(todayFromApi);
      lastTodayPageRef.current = 1;
    } else if (todayPagination?.page === todayPage && todayPage > lastTodayPageRef.current) {
      setTodayList((prev) => [...prev, ...todayFromApi]);
      lastTodayPageRef.current = todayPage;
    }
  }, [todayFromApi, todayPagination?.page, todayPage]);

  useEffect(() => {
    if (completedPage === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulates paged API results (see above).
      setCompletedList(completedFromApi);
      lastCompletedPageRef.current = 1;
    } else if (completedPagination?.page === completedPage && completedPage > lastCompletedPageRef.current) {
      setCompletedList((prev) => [...prev, ...completedFromApi]);
      lastCompletedPageRef.current = completedPage;
    }
  }, [completedFromApi, completedPagination?.page, completedPage]);
  const todayTotal = todayPagination?.total ?? 0;
  const completedTotal = completedPagination?.total ?? 0;
  const todayHasMore = todayPagination?.hasMore ?? false;
  const completedHasMore = completedPagination?.hasMore ?? false;
  const averageScore = todayData?.data?.averageScore ?? completedData?.data?.averageScore ?? 0;

  const stats = {
    todayCount: todayTotal,
    total: completedTotal,
    avg: averageScore,
  };

  const quizList = activeTab === "today" ? todayList.map(testToDisplay) : completedList.map(testToDisplay);
  const hasMore = activeTab === "today" ? todayHasMore : completedHasMore;
  const isLoading = activeTab === "today" ? todayFetching : completedFetching;

  const loadMore = () => {
    if (!hasMore || isLoading) return;
    if (activeTab === "today") setTodayPage((p) => p + 1);
    else setCompletedPage((p) => p + 1);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset paging so the accumulated lists are rebuilt from page 1, then force
    // a network round-trip (setPage alone is a no-op when already on page 1).
    setTodayPage(1);
    setCompletedPage(1);
    lastTodayPageRef.current = 0;
    lastCompletedPageRef.current = 0;
    try {
      await Promise.all([refetchToday(), refetchCompleted()]);
    } catch {
      // Ignore – the list keeps whatever it already had.
    } finally {
      setRefreshing(false);
    }
  }, [refetchToday, refetchCompleted]);

  const handleStartQuiz = (quizId: string) => {
    router.push(`/quiz/${quizId}` as any);
  };

  // ─── Per-test notification subscription (bell) ───
  const [toggleNotify] = useToggleTestNotificationMutation();
  const [notifySet, setNotifySet] = useState<Set<string>>(new Set());

  // Seed local subscription state from the API list (bell ON for subscribed tests)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seeds bell state from server data.
    setNotifySet((prev) => {
      const next = new Set(prev);
      [...todayList, ...completedList].forEach((t) => {
        if (t.isNotifySubscribed) next.add(t._id);
      });
      return next;
    });
  }, [todayList, completedList]);

  const handleToggleNotify = useCallback(
    async (testId: string) => {
      // Optimistic toggle
      const wasOn = notifySet.has(testId);
      setNotifySet((prev) => {
        const next = new Set(prev);
        if (wasOn) next.delete(testId);
        else next.add(testId);
        return next;
      });
      try {
        const res = await toggleNotify(testId).unwrap();
        const subscribed = res?.data?.subscribed;
        if (typeof subscribed === "boolean") {
          setNotifySet((prev) => {
            const next = new Set(prev);
            if (subscribed) next.add(testId);
            else next.delete(testId);
            return next;
          });
        }
      } catch {
        // Revert on failure
        setNotifySet((prev) => {
          const next = new Set(prev);
          if (wasOn) next.add(testId);
          else next.delete(testId);
          return next;
        });
      }
    },
    [notifySet, toggleNotify]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Quiz</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Test your knowledge
          </Text>
        </View>
        <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="trophy-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* STATS BANNER */}
      <LinearGradient
        colors={["#0A4D9C", "#1EC8FF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.statsBanner}
      >
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.todayCount}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.avg}%</Text>
          <Text style={styles.statLabel}>Avg Score</Text>
        </View>
        <View style={styles.statsDecor}>
          <Ionicons name="ribbon" size={70} color="rgba(255,255,255,0.1)" />
        </View>
      </LinearGradient>

      {/* TAB SWITCHER */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "today" && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab("today")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="today-outline"
            size={18}
            color={activeTab === "today" ? theme.colors.buttonText : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "today" ? theme.colors.buttonText : theme.colors.textSecondary },
            ]}
          >
            Today ({stats.todayCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "complete" && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setActiveTab("complete")}
          activeOpacity={0.8}
        >
          <Ionicons
            name="checkmark-done-outline"
            size={18}
            color={activeTab === "complete" ? theme.colors.buttonText : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "complete" ? theme.colors.buttonText : theme.colors.textSecondary },
            ]}
          >
            Completed ({stats.total})
          </Text>
        </TouchableOpacity>
      </View>

      {/* QUIZ LIST */}
      <FlatList
        data={quizList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isLoading && quizList.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <QuizCard
            quiz={item}
            isComplete={activeTab === "complete"}
            notifyOn={notifySet.has(item.id)}
            onToggleNotify={() => handleToggleNotify(item.id)}
            onStartPress={activeTab === "today" ? () => handleStartQuiz(item.id) : undefined}
            onResultPress={activeTab === "complete" ? () => router.push(`/quiz/result/${item.id}`) : undefined}
          />
        )}
        ListEmptyComponent={
          todayFetching && activeTab === "today" && todayList.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Loading quizzes...
              </Text>
            </View>
          ) : completedFetching && activeTab === "complete" && completedList.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary, marginTop: 12 }]}>
                Loading...
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="clipboard-outline" size={48} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                No quizzes {activeTab === "today" ? "for today" : "completed yet"}
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.colors.textSecondary }]}>
                {activeTab === "today"
                  ? "Check back later for new quizzes"
                  : "Start taking quizzes to see your progress"}
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

/* =================== QUIZ CARD =================== */

function QuizCard({
  quiz,
  isComplete,
  notifyOn,
  onToggleNotify,
  onStartPress,
  onResultPress,
}: {
  quiz: QuizDisplay;
  isComplete: boolean;
  notifyOn?: boolean;
  onToggleNotify?: () => void;
  onStartPress?: () => void;
  onResultPress?: () => void;
}) {
  const diff = DIFFICULTY_COLORS[quiz.difficulty] ?? DIFFICULTY_COLORS.Medium;
  const startEnabled = isStartEnabled(quiz.startTime);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card }]}
      activeOpacity={0.8}
      onPress={isComplete ? onResultPress : undefined}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.cardIcon,
            { backgroundColor: isComplete ? theme.colors.success + "15" : theme.colors.primary + "15" },
          ]}
        >
          <Ionicons
            name={(quiz.icon === "document-text" ? "document-text" : quiz.icon) as any}
            size={26}
            color={isComplete ? theme.colors.success : theme.colors.primary}
          />
        </View>

        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {quiz.title}
          </Text>
          <View style={styles.cardMeta}>
            <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
              <Text style={[styles.diffText, { color: diff.text }]}>{quiz.difficulty}</Text>
            </View>
            <Text style={[styles.cardCategory, { color: theme.colors.textSecondary }]}>
              {quiz.category}
            </Text>
          </View>
        </View>

        {!isComplete && onToggleNotify ? (
          <TouchableOpacity
            style={[
              styles.bellBtn,
              {
                backgroundColor: notifyOn
                  ? theme.colors.primary + "1A"
                  : theme.colors.surface,
              },
            ]}
            onPress={onToggleNotify}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={notifyOn ? "notifications" : "notifications-outline"}
              size={20}
              color={notifyOn ? theme.colors.primary : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        ) : null}

        {isComplete && quiz.score !== undefined ? (
          <View style={styles.scoreCircle}>
            <View
              style={[
                styles.scoreRing,
                {
                  borderColor: quiz.score >= 80
                    ? theme.colors.success
                    : quiz.score >= 60
                    ? theme.colors.primary
                    : theme.colors.error,
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreValue,
                  {
                    color: quiz.score >= 80
                      ? theme.colors.success
                      : quiz.score >= 60
                      ? theme.colors.primary
                      : theme.colors.error,
                  },
                ]}
              >
                {quiz.score}%
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.startBtn,
              { backgroundColor: startEnabled ? theme.colors.primary : theme.colors.border },
            ]}
            activeOpacity={0.8}
            onPress={startEnabled ? onStartPress : undefined}
            disabled={!startEnabled}
          >
            <Ionicons name="play" size={16} color={startEnabled ? theme.colors.buttonText : theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.cardStat}>
          <Ionicons name="help-circle-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.cardStatText, { color: theme.colors.textSecondary }]}>
            {quiz.questions} questions
          </Text>
        </View>
        <View style={styles.cardStat}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.cardStatText, { color: theme.colors.textSecondary }]}>
            {quiz.duration}
          </Text>
        </View>
        {isComplete ? (
          <View style={styles.cardStat}>
            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
            <Text style={[styles.cardStatText, { color: theme.colors.success }]}>Done</Text>
          </View>
        ) : (
          <>
            {quiz.startTime ? (
              <View style={styles.cardStat}>
                <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.cardStatText, { color: theme.colors.primary }]} numberOfLines={1}>
                  Starts {formatStartTime(quiz.startTime)}
                </Text>
              </View>
            ) : (
              <View style={styles.cardStat}>
                <Ionicons name="flash-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.cardStatText, { color: theme.colors.primary }]}>Start</Text>
              </View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* =================== STYLES =================== */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  title: { fontFamily: fonts.bold, fontSize: 28 },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, marginTop: 2 },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statsBanner: {
    marginHorizontal: 20,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    overflow: "hidden",
    marginBottom: 16,
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontFamily: fonts.bold, fontSize: 24, color: "#FFFFFF" },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  statDivider: { width: 1, height: 36, borderRadius: 1 },
  statsDecor: { position: "absolute", right: -10, bottom: -10 },
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabText: { fontFamily: fonts.semiBold, fontSize: 14 },
  list: { paddingHorizontal: 20 },
  footerLoader: { paddingVertical: 16, alignItems: "center" },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  cardTitle: { fontFamily: fonts.semiBold, fontSize: 16 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  diffText: { fontFamily: fonts.semiBold, fontSize: 11 },
  cardCategory: { fontFamily: fonts.regular, fontSize: 12 },
  scoreCircle: {},
  scoreRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreValue: { fontFamily: fonts.bold, fontSize: 13 },
  startBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 16,
  },
  cardStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardStatText: { fontFamily: fonts.regular, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: { fontFamily: fonts.semiBold, fontSize: 18, marginBottom: 8 },
  emptyDesc: { fontFamily: fonts.regular, fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
