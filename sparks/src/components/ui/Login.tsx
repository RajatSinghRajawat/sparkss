import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Input, PasswordInput, Button } from "../common";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginProps {
  onLogin: (credentials: LoginCredentials) => void | Promise<void>;
  loading?: boolean;
  emailPlaceholder?: string;
  passwordPlaceholder?: string;
  submitLabel?: string;
}

export function Login({
  onLogin,
  loading = false,
  emailPlaceholder = "Enter your email",
  passwordPlaceholder = "Enter your password",
  submitLabel = "Login",
}: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password.trim()) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onLogin({ email: email.trim(), password });
  };

  // Plain View, not a KeyboardAvoidingView — see the note in Signup.tsx: the
  // screen owns keyboard handling, and nesting two KAVs makes the form jump.
  return (
    <View style={styles.container}>
      <Input
        label="Email"
        placeholder={emailPlaceholder}
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

      <PasswordInput
        label="Password"
        placeholder={passwordPlaceholder}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        error={errors.password}
      />

      <Button
        title={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        fullWidth
        size="lg"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  button: {
    marginTop: 16,
  },
});
