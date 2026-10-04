import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme, fonts } from "../../src/theme";
import {
  useGetHelpMessagesQuery,
  useSendHelpMessageMutation,
} from "../../src/store";
import type { HelpMessage } from "../../src/types/auth.types";

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ msg }: { msg: HelpMessage }) {
  const isStudent = msg.from === "student";

  return (
    <View
      style={[
        styles.bubbleWrap,
        isStudent ? styles.bubbleWrapRight : styles.bubbleWrapLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isStudent ? styles.bubbleRight : styles.bubbleLeft,
          isStudent
            ? { backgroundColor: theme.colors.primary }
            : { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            { color: isStudent ? theme.colors.buttonText : theme.colors.textPrimary },
          ]}
        >
          {msg.text}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            { color: isStudent ? "rgba(255,255,255,0.8)" : theme.colors.textSecondary },
          ]}
        >
          {formatTime(msg.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export default function HelpCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [inputText, setInputText] = useState("");
  const listRef = useRef<FlatList>(null);

  const { data, isLoading, isError, refetch } = useGetHelpMessagesQuery(undefined, {
    refetchOnFocus: true,
  });
  const [sendMessage, { isLoading: sending }] = useSendHelpMessageMutation();

  const messages = data?.data?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText("");
    try {
      await sendMessage({ text }).unwrap();
    } catch {
      // Error is reported by the API middleware; put the text back so a failed
      // send does not silently throw away what the user typed.
      setInputText((current) => (current.length > 0 ? current : text));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top || 0, paddingBottom: 12, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          Help Center
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {isLoading && messages.length === 0 ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Loading chat...
          </Text>
        </View>
      ) : isError && messages.length === 0 ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Failed to load. Pull to retry.
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={[styles.retryText, { color: theme.colors.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={[...messages].reverse()}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <MessageBubble msg={item} />}
            inverted
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 12, paddingTop: 16 },
            ]}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconWrap, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons name="chatbubbles-outline" size={40} color={theme.colors.textSecondary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  Chat with support
                </Text>
                <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
                  Send a message below. Our team will reply soon.
                </Text>
              </View>
            }
          />

          <View
            style={[
              styles.inputRow,
              {
                paddingBottom: insets.bottom + 12,
                paddingTop: 12,
                paddingHorizontal: 16,
                borderTopColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Type your message..."
              placeholderTextColor={theme.colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.surface,
                },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color={theme.colors.buttonText} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? theme.colors.buttonText : theme.colors.textSecondary}
                />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  loadingText: { fontFamily: fonts.regular, fontSize: 14, marginTop: 12 },
  retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontFamily: fonts.semiBold, fontSize: 15 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 18,
    textAlign: "center",
  },
  refreshBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: { paddingHorizontal: 16 },
  bubbleWrap: {
    marginBottom: 10,
    maxWidth: "82%",
  },
  bubbleWrapLeft: { alignSelf: "flex-start" },
  bubbleWrapRight: { alignSelf: "flex-end" },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleLeft: { borderTopLeftRadius: 4 },
  bubbleRight: { borderTopRightRadius: 4 },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTime: {
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 17,
    marginBottom: 6,
  },
  emptySub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
