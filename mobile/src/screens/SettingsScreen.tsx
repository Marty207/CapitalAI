import { type ReactNode } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { usePrivacy } from "../context/PrivacyContext";
import { useTheme } from "../context/ThemeContext";
import { buildEnvironmentLabel, isDevBuild, isPlaidSandbox } from "../lib/environment";
import { ThemeColors, ThemePreference, radii, spacing } from "../theme/colors";

function SettingRow({
  label,
  description,
  colors,
  disabled,
  children,
}: {
  label: string;
  description?: string;
  colors: ThemeColors;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const styles = createStyles(colors);
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, disabled && styles.textDisabled]}>{label}</Text>
        {description ? (
          <Text style={[styles.rowDescription, disabled && styles.textDisabled]}>{description}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

export function SettingsScreen() {
  const { session, signOut } = useAuth();
  const { theme, preference, setPreference } = useTheme();
  const { settings, updateSetting, resetPrivacy } = usePrivacy();
  const { colors } = theme;
  const styles = createStyles(colors);

  const email = session?.user.email ?? "Signed in";
  const aiOn = settings.aiFeaturesEnabled;

  const handleResetPrivacy = () => {
    Alert.alert(
      "Reset privacy settings",
      "Restore recommended defaults? AI will stay off and account details will stay redacted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", onPress: resetPrivacy },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Account</Text>
      <View style={styles.card}>
        <SettingRow label="Email" colors={colors}>
          <Text style={styles.value} numberOfLines={1}>
            {email}
          </Text>
        </SettingRow>
      </View>

      <Text style={styles.section}>Appearance</Text>
      <View style={styles.card}>
        <SettingRow
          label="Dark mode"
          description="Switch between light and dark themes"
          colors={colors}
        >
          <Switch
            value={preference === "dark"}
            onValueChange={(enabled) => setPreference(enabled ? "dark" : "light")}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={preference === "dark" ? colors.primary : colors.white}
          />
        </SettingRow>

        <View style={styles.divider} />

        <View style={styles.segmentRow}>
          {(["light", "dark"] as ThemePreference[]).map((mode) => {
            const active = preference === mode;
            return (
              <Pressable
                key={mode}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setPreference(mode)}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {mode === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={styles.section}>Bank connections</Text>
      <View style={styles.card}>
        <SettingRow label="Environment" colors={colors}>
          <Text style={styles.valueSmall}>{buildEnvironmentLabel()}</Text>
        </SettingRow>
        <View style={styles.divider} />
        <Text style={styles.hint}>
          {isDevBuild()
            ? isPlaidSandbox()
              ? "Sandbox uses fake banks — no real money. Link accounts from Home with Plaid test credentials (user_good / pass_good)."
              : "Production Plaid connects to real banks."
            : "Install the dev build to link accounts: npm run ios:dev"}
        </Text>
      </View>

      <Text style={styles.section}>Privacy & AI</Text>
      <View style={styles.card}>
        <SettingRow
          label="AI features"
          description="Enable personalized insights and chat (when available)"
          colors={colors}
        >
          <Switch
            value={settings.aiFeaturesEnabled}
            onValueChange={(v) => updateSetting("aiFeaturesEnabled", v)}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={settings.aiFeaturesEnabled ? colors.primary : colors.white}
          />
        </SettingRow>

        <View style={styles.divider} />

        <SettingRow
          label="External AI providers"
          description="Allow OpenAI, DeepSeek, etc. to process financial summaries"
          colors={colors}
          disabled={!aiOn}
        >
          <Switch
            value={settings.externalAiAllowed}
            onValueChange={(v) => updateSetting("externalAiAllowed", v)}
            disabled={!aiOn}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={settings.externalAiAllowed ? colors.primary : colors.white}
          />
        </SettingRow>

        <View style={styles.divider} />

        <SettingRow
          label="Summaries only"
          description="Never send full transaction lists to AI — aggregates only"
          colors={colors}
          disabled={!aiOn}
        >
          <Switch
            value={settings.summariesOnly}
            onValueChange={(v) => updateSetting("summariesOnly", v)}
            disabled={!aiOn}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={settings.summariesOnly ? colors.primary : colors.white}
          />
        </SettingRow>

        <View style={styles.divider} />

        <SettingRow
          label="Redact account details"
          description="Strip account names and numbers from anything sent to AI"
          colors={colors}
          disabled={!aiOn}
        >
          <Switch
            value={settings.redactAccountDetails}
            onValueChange={(v) => updateSetting("redactAccountDetails", v)}
            disabled={!aiOn}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={settings.redactAccountDetails ? colors.primary : colors.white}
          />
        </SettingRow>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How your data is handled</Text>
        <Text style={styles.infoBody}>
          Bank credentials go to Plaid, not CapitalAI. We store balances and transactions in
          your database. AI is off by default — nothing is sent to third-party models until you
          enable it above.
        </Text>
      </View>

      <Pressable onPress={handleResetPrivacy} style={styles.resetBtn}>
        <Text style={styles.resetText}>Reset privacy to defaults</Text>
      </Pressable>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <SettingRow label="Version" colors={colors}>
          <Text style={styles.value}>1.0.0</Text>
        </SettingRow>
      </View>

      <Pressable
        style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        onPress={signOut}
      >
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    section: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.card,
      overflow: "hidden",
    },
    infoCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginTop: spacing.md,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    infoBody: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      gap: spacing.md,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
    },
    rowDescription: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 18,
    },
    textDisabled: {
      color: colors.textMuted,
    },
    value: {
      fontSize: 14,
      color: colors.textSecondary,
      maxWidth: 180,
    },
    valueSmall: {
      fontSize: 12,
      color: colors.textSecondary,
      maxWidth: 140,
      textAlign: "right",
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    segmentRow: {
      flexDirection: "row",
      padding: spacing.sm,
      gap: spacing.sm,
    },
    segment: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.sm,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    segmentActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    segmentText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    segmentTextActive: {
      color: colors.primaryDark,
      fontWeight: "600",
    },
    hint: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      padding: spacing.md,
    },
    resetBtn: {
      marginTop: spacing.md,
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    resetText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    signOut: {
      marginTop: spacing.lg,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.error,
      paddingVertical: 14,
      alignItems: "center",
    },
    signOutPressed: {
      backgroundColor: colors.errorBg,
    },
    signOutText: {
      color: colors.error,
      fontWeight: "600",
      fontSize: 15,
    },
  });
