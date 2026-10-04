import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fonts } from "../../src/theme";

const TEAL = "#0DBD8B";
const BG = "#F2F4F5";
const CARD = "#FFFFFF";
const TEXT_DARK = "#2A3439";
const TEXT_GRAY = "#8A959C";
const LABEL_GRAY = "#7E8B92";
const LINE = "#D7DDE0";
const PLACEHOLDER = "#A9B2B8";

const QUICK_FILL = [
  { name: "Sarah J.", uri: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Sarah J.", uri: "https://randomuser.me/api/portraits/women/68.jpg" },
  { name: "Alex Chen", uri: "https://randomuser.me/api/portraits/women/17.jpg" },
];

const STEPS = [
  { num: "1", label: "DETAILS" },
  { num: "2", label: "VERIFY" },
  { num: "3", label: "DONE" },
];

const PAYMENT_METHODS = ["IMPS", "NEFT", "RTGS"];

export default function FundTransferScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [accountType, setAccountType] = useState<"Savings" | "Current">("Savings");
  const [paymentMethod, setPaymentMethod] = useState("IMPS");
  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={26} color="#6B7A83" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fund Transfer/ Send Money</Text>
        </View>

        {/* Quick Fill */}
        <Text style={styles.sectionTitle}>Quick Fill</Text>
        <View style={styles.quickFillRow}>
          {QUICK_FILL.map((b, i) => (
            <TouchableOpacity key={i} style={styles.quickFillItem}>
              <View style={styles.avatarRing}>
                <Image source={{ uri: b.uri }} style={styles.avatar} />
              </View>
              <Text style={styles.quickFillName}>{b.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.quickFillItem}>
            <View style={styles.newCircle}>
              <Ionicons name="add" size={30} color="#6B7A83" />
            </View>
            <Text style={styles.quickFillName}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={24} color="#B4BCC2" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search beneficiary label, account....."
            placeholderTextColor={PLACEHOLDER}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Stepper */}
        <View style={styles.stepper}>
          {STEPS.map((step, i) => {
            const active = i === 0;
            return (
              <React.Fragment key={step.num}>
                <View style={styles.stepItem}>
                  <View style={[styles.stepCircle, active && styles.stepCircleActive]}>
                    <Text style={[styles.stepNum, active && styles.stepNumActive]}>
                      {step.num}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                    {step.label}
                  </Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepLine, i === 0 && styles.stepLineActive]} />
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Beneficiary Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-add-outline" size={20} color={TEAL} />
            <Text style={styles.cardTitle}>BENEFICIARY DETAILS</Text>
          </View>

          <Text style={styles.fieldLabel}>BANK NAME</Text>
          <TouchableOpacity style={styles.selectRow}>
            <Text style={styles.selectText}>Select a bank</Text>
            <Ionicons name="chevron-down" size={22} color="#6B7A83" />
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>ACCOUNT NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account number"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            value={accountNumber}
            onChangeText={setAccountNumber}
          />

          <Text style={styles.fieldLabel}>MOBILE NUMBER</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 00000 00000"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="phone-pad"
            value={mobileNumber}
            onChangeText={setMobileNumber}
          />

          <Text style={styles.fieldLabel}>ACCOUNT TYPE</Text>
          <View style={styles.accountTypeRow}>
            <View style={styles.segment}>
              {(["Savings", "Current"] as const).map((type) => {
                const selected = accountType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                    onPress={() => setAccountType(type)}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.addBeneficiaryBtn}>
              <Ionicons name="add" size={18} color={TEAL} />
              <Text style={styles.addBeneficiaryText}>Add Beneficiary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color={TEAL} />
            <Text style={styles.cardTitle}>TRANSACTION DETAILS</Text>
          </View>

          <View style={styles.orderIdRow}>
            <Text style={styles.orderIdLabel}>ORDER ID</Text>
            <Text style={styles.orderIdValue}>#VLY-98234-AX</Text>
          </View>

          <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
          <View style={styles.methodRow}>
            {PAYMENT_METHODS.map((m) => {
              const selected = paymentMethod === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodBtn, selected && styles.methodBtnActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.methodText, selected && styles.methodTextActive]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.rupee}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="#C9CFD3"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>
          <View style={styles.amountFooter}>
            <Text style={styles.availableText}>Available: ₹82,450.00</Text>
            <TouchableOpacity onPress={() => setAmount("82450.00")}>
              <Text style={styles.useMaxText}>USE MAX</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>REMARK (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="What's this for?"
            placeholderTextColor={PLACEHOLDER}
            value={remark}
            onChangeText={setRemark}
          />
        </View>

        {/* Security footer */}
        <View style={styles.securePill}>
          <Ionicons name="lock-closed" size={14} color={TEXT_DARK} />
          <Text style={styles.secureText}>SECURE 256-BIT ENCRYPTION</Text>
        </View>
        <Text style={styles.secureNote}>
          Your security is our priority. This verification step{"\n"}ensures that only
          you can authorize this transaction.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: BG },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 16,
  },
  backBtn: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#C6CDD2",
    borderWidth: 3,
    borderColor: "#BFD9EE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 24,
    color: TEXT_DARK,
  },

  /* Quick Fill */
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: TEXT_DARK,
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 16,
  },
  quickFillRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  quickFillItem: { alignItems: "center", width: 72 },
  avatarRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#E3E8EB",
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  newCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#AEB7BD",
    alignItems: "center",
    justifyContent: "center",
  },
  quickFillName: {
    marginTop: 8,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: TEXT_DARK,
  },

  /* Search */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 24,
    paddingHorizontal: 18,
    height: 58,
    borderRadius: 29,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: "#E3E8EB",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: TEXT_DARK,
    paddingVertical: 0,
  },

  /* Stepper */
  stepper: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 32,
    paddingHorizontal: 28,
  },
  stepItem: { alignItems: "center", width: 64 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E1E5E8",
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleActive: { backgroundColor: TEAL },
  stepNum: { fontFamily: fonts.semiBold, fontSize: 14, color: "#8A959C" },
  stepNumActive: { color: "#FFFFFF" },
  stepLabel: {
    marginTop: 8,
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: "#9AA4AB",
  },
  stepLabelActive: { color: TEAL },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#D3DAD7",
    marginTop: 15,
    marginHorizontal: 4,
  },
  stepLineActive: { backgroundColor: TEAL },

  /* Cards */
  card: {
    backgroundColor: CARD,
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 28,
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 1.2,
    color: "#4A555C",
  },

  /* Fields */
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    letterSpacing: 0.8,
    color: LABEL_GRAY,
    marginTop: 22,
    marginBottom: 4,
  },
  selectRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1.5,
    borderBottomColor: "#B9C2C7",
    paddingVertical: 12,
  },
  selectText: { fontFamily: fonts.regular, fontSize: 18, color: TEXT_DARK },
  input: {
    fontFamily: fonts.regular,
    fontSize: 17,
    color: TEXT_DARK,
    borderBottomWidth: 1.5,
    borderBottomColor: LINE,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  /* Account type */
  accountTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#EDEFF1",
    borderRadius: 24,
  },
  segmentBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  segmentBtnActive: { backgroundColor: TEAL },
  segmentText: { fontFamily: fonts.medium, fontSize: 15, color: TEXT_DARK },
  segmentTextActive: { color: "#FFFFFF", fontFamily: fonts.semiBold },
  addBeneficiaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: TEAL,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  addBeneficiaryText: { fontFamily: fonts.semiBold, fontSize: 15, color: TEAL },

  /* Order id */
  orderIdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EBF1EE",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  orderIdLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    letterSpacing: 1,
    color: "#5A656C",
  },
  orderIdValue: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 15,
    fontWeight: "700",
    color: TEXT_DARK,
    letterSpacing: 1,
  },

  /* Payment method */
  methodRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  methodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#D7DDE0",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: CARD,
  },
  methodBtnActive: { backgroundColor: TEAL, borderColor: TEAL },
  methodText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    letterSpacing: 1,
    color: "#5A656C",
  },
  methodTextActive: { color: "#FFFFFF" },

  /* Amount */
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#3A4449",
    paddingBottom: 6,
    gap: 8,
  },
  rupee: { fontFamily: fonts.bold, fontSize: 28, color: TEXT_DARK },
  amountInput: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 34,
    color: TEXT_DARK,
    paddingVertical: 4,
  },
  amountFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  availableText: { fontFamily: fonts.regular, fontSize: 13, color: TEXT_GRAY },
  useMaxText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    letterSpacing: 0.5,
    color: TEAL,
  },

  /* Security footer */
  securePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    backgroundColor: "#E2E6E9",
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginTop: 36,
  },
  secureText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    letterSpacing: 1.5,
    color: TEXT_DARK,
  },
  secureNote: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: "#6B7A83",
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 30,
  },
});
