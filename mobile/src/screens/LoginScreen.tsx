import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { ThemeColors, radii, spacing } from "../theme/colors";

function formatAuthError(message: string, isSignUp: boolean): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) {
    return isSignUp
      ? "Too many sign-up emails sent. Wait about an hour, or turn off email confirmation in Supabase (Authentication → Providers → Email) for development."
      : "Too many login attempts. Wait a few minutes and try again.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "This email is already registered. Sign in instead, or check your inbox for a confirmation link.";
  }
  return message;
}

export function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { data, error: signUpError } = await signUp(trimmedEmail, password);
      if (signUpError) {
        setError(formatAuthError(signUpError.message, true));
      } else if (data.session) {
        setMessage("Welcome to CapitalAI.");
      } else {
        setMessage("Account created. Check your email to confirm, then sign in.");
        setIsSignUp(false);
      }
    } else {
      const { error: signInError } = await signIn(trimmedEmail, password);
      if (signInError) {
        setError(
          formatAuthError(
            signInError.message === "Invalid login credentials"
              ? "Invalid email or password. If you just signed up, confirm your email first."
              : signInError.message,
            false
          )
        );
      }
    }

    setLoading(false);
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setMessage(null);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandRow}>
            <View style={styles.logoMark} />
            <Text style={styles.brand}>CapitalAI</Text>
          </View>
          <Text style={styles.headline}>
            {isSignUp ? "Create your account" : "Welcome back"}
          </Text>
          <Text style={styles.subtitle}>
            Your personal financial analyst, in your pocket.
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              textContentType={isSignUp ? "newPassword" : "password"}
              value={password}
              onChangeText={setPassword}
            />

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {message ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{message}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? "Create account" : "Sign in"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={switchMode} style={styles.toggleWrap}>
              <Text style={styles.toggle}>
                {isSignUp
                  ? "Already have an account? "
                  : "Don't have an account? "}
                <Text style={styles.toggleAccent}>
                  {isSignUp ? "Sign in" : "Sign up"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoMark: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    marginRight: spacing.sm,
  },
  brand: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headline: {
    fontSize: 28,
    fontWeight: "600",
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: spacing.md,
  },
  buttonPressed: {
    backgroundColor: colors.primaryDark,
  },
  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  toggleWrap: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  toggle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  toggleAccent: {
    color: colors.primary,
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
  },
  successBox: {
    backgroundColor: colors.successBg,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
    lineHeight: 20,
  },
});
