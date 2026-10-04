import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Input, PasswordInput, Button, OTPInput, Stepper, TextButton } from "../common";
import { theme , fonts } from "../../theme";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STEPS = ["Email", "OTP", "Details"];

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  otp: string;
}

interface SignupProps {
  onSignup: (credentials: SignupCredentials) => void | Promise<void>;
  onSendOtp?: (email: string) => void | Promise<void>;
  loading?: boolean;
  sendOtpLabel?: string;
  verifyOtpLabel?: string;
  createAccountLabel?: string;
}

export function Signup({
  onSignup,
  onSendOtp,
  loading = false,
  sendOtpLabel = "Send OTP",
  verifyOtpLabel = "Verify OTP",
  createAccountLabel = "Create Account",
}: SignupProps) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    otp?: string;
    name?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [otpSending, setOtpSending] = useState(false);

  const clearErrors = () => setErrors({});

  /* ---------- Step 1: Email ---------- */
  const validateEmail = () => {
    if (!email.trim()) {
      setErrors({ email: "Email is required" });
      return false;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setErrors({ email: "Please enter a valid email" });
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateEmail()) return;
    setOtpSending(true);
    try {
      if (onSendOtp) {
        await onSendOtp(email.trim());
      } else {
        await new Promise((r) => setTimeout(r, 600));
      }
      setStep(2);
      clearErrors();
      setOtp("");
    } catch (e) {
      setErrors({ email: "Failed to send OTP. Please try again." });
    } finally {
      setOtpSending(false);
    }
  };

  /* ---------- Step 2: OTP Verify ---------- */
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setErrors({ otp: "Please enter the 6-digit OTP" });
      return;
    }
    clearErrors();
    setStep(3);
  };

  const handleOtpComplete = (value: string) => {
    setOtp(value);
    if (value.length === 6) {
      setErrors((e) => ({ ...e, otp: undefined }));
    }
  };

  /* ---------- Step 3: Name & Password ---------- */
  const validateDetails = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }
    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    } else if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = async () => {
    if (!validateDetails()) return;
    await onSignup({
      name: name.trim(),
      email: email.trim(),
      password,
      otp,
    });
  };

  const handleBack = () => {
    clearErrors();
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  // Plain View, not a KeyboardAvoidingView: the screen that renders this form
  // already handles the keyboard. Two nested KAVs each add their own padding,
  // and the form jumps every time the keyboard opens.
  return (
    <View style={styles.container}>
      <Stepper steps={STEPS} currentStep={step - 1} />

      {/* Step 1: Email */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
            }}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            title={sendOtpLabel}
            onPress={handleSendOtp}
            loading={otpSending}
            fullWidth
            size="lg"
            style={styles.button}
          />
        </View>
      )}

      {/* Step 2: OTP Verify */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text
            style={[styles.otpHint, { color: theme.colors.textSecondary }]}
          >
            OTP sent to {email}
          </Text>
          <OTPInput
            value={otp}
            onChange={setOtp}
            onComplete={handleOtpComplete}
            length={6}
          />
          {errors.otp && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errors.otp}
            </Text>
          )}
          <Button
            title={verifyOtpLabel}
            onPress={handleVerifyOtp}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
          />
          <TextButton
            title="Resend OTP"
            loading={otpSending}
            onPress={async () => {
              setOtpSending(true);
              try {
                if (onSendOtp) await onSendOtp(email.trim());
                else await new Promise((r) => setTimeout(r, 600));
                clearErrors();
                setOtp("");
              } finally {
                setOtpSending(false);
              }
            }}
            style={styles.resendBtn}
          />
        </View>
      )}

      {/* Step 3: Name & Password */}
      {step === 3 && (
        <View style={styles.stepContent}>
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            error={errors.name}
            autoCapitalize="words"
          />
          <PasswordInput
            label="Password"
            placeholder="Create a password (min 6 characters)"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
            }}
            error={errors.password}
          />
          <PasswordInput
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword)
                setErrors((e) => ({ ...e, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword}
          />
          <Button
            title={createAccountLabel}
            onPress={handleCreateAccount}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
          />
        </View>
      )}

      {step > 1 && (
        <TextButton
          title="Back"
          onPress={handleBack}
          variant="secondary"
          style={styles.backBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  stepContent: {
    marginTop: 24,
  },
  button: {
    marginTop: 16,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  otpHint: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: 16,
  },
  resendBtn: {
    marginTop: 12,
  },
  backBtn: {
    marginTop: 16,
  },
});
