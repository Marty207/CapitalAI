import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircularGauge } from "../components/CircularGauge";
import { useTheme } from "../context/ThemeContext";
import { api, Account } from "../lib/api";
import { buildEnvironmentLabel, isPlaidSandbox } from "../lib/environment";
import {
  creditScoreColor,
  creditScoreLabel,
  demoCreditScore,
  formatCompactCurrency,
  formatCurrency,
  parseBalance,
  sumBalances,
} from "../lib/money";
import { openPlaidLink } from "../lib/plaid";
import { ThemeColors, radii, spacing } from "../theme/colors";

export function HomeScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getAccounts();
      setAccounts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleLinkAccount = async () => {
    setLinking(true);
    setError(null);
    try {
      const { link_token } = await api.createLinkToken();
      await openPlaidLink(link_token, async (publicToken) => {
        await api.exchangePublicToken(publicToken);
        await loadAccounts();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to link account");
    } finally {
      setLinking(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      await api.syncTransactions();
      await loadAccounts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const totalBalance = sumBalances(accounts, (a) => a.is_active !== false);
  const cashBalance = sumBalances(
    accounts,
    (a) => a.is_active !== false && a.type === "depository"
  );
  const creditScore = demoCreditScore(isPlaidSandbox());
  const cashGoal = 10000;
  const rawCashProgress = cashGoal > 0 ? cashBalance / cashGoal : 0;
  const cashProgress =
    cashBalance > 0 ? Math.min(1, Math.max(rawCashProgress, 0.15)) : 0;
  const creditProgress =
    creditScore !== null ? Math.min(1, Math.max(0, (creditScore - 300) / 550)) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Overview</Text>
          <Text style={styles.title}>CapitalAI</Text>
          <View style={styles.envBadge}>
            <Text style={styles.envBadgeText}>{buildEnvironmentLabel()}</Text>
          </View>
        </View>

        {isPlaidSandbox() ? (
          <Text style={styles.sandboxHint}>
            Sandbox — use First Platypus Bank (not Discover). Credentials: user_good / pass_good.
          </Text>
        ) : null}

        <View style={styles.gaugeRow}>
          <View style={styles.gaugeCard}>
            <CircularGauge
              progress={cashProgress}
              color={colors.primary}
              trackColor={colors.border}
              centerValue={formatCompactCurrency(totalBalance)}
              centerLabel="Total balance"
              centerSublabel={`Cash ${formatCompactCurrency(cashBalance)}`}
              valueColor={colors.text}
              labelColor={colors.textSecondary}
              sublabelColor={colors.textMuted}
            />
          </View>

          <View style={styles.gaugeCard}>
            <CircularGauge
              progress={creditProgress}
              color={creditScore !== null ? creditScoreColor(creditScore) : colors.border}
              trackColor={colors.border}
              centerValue={creditScore !== null ? String(creditScore) : "—"}
              centerLabel="Credit score"
              centerSublabel={
                creditScore !== null
                  ? creditScoreLabel(creditScore)
                  : "Coming soon"
              }
              valueColor={colors.text}
              labelColor={colors.textSecondary}
              sublabelColor={colors.textMuted}
              footer={
                creditScore !== null && isPlaidSandbox() ? (
                  <Text style={styles.demoTag}>Sandbox demo</Text>
                ) : null
              }
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
            onPress={handleLinkAccount}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Link account</Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryPressed]}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.secondaryButtonText}>Sync</Text>
            )}
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Accounts</Text>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : (
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={loadAccounts}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={accounts.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={
              <Text style={styles.empty}>
                No accounts linked yet. Tap Link account to get started.
              </Text>
            }
            renderItem={({ item, index }) => (
              <View
                style={[
                  styles.accountRow,
                  index === accounts.length - 1 && styles.accountRowLast,
                ]}
              >
                <View style={styles.accountIcon}>
                  <Text style={styles.accountIconText}>
                    {(item.name[0] ?? "A").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{item.name}</Text>
                  <Text style={styles.accountMeta}>
                    {item.type}
                    {item.mask ? ` · ••••${item.mask}` : ""}
                  </Text>
                </View>
                <Text style={styles.accountBalance}>
                  {formatCurrency(parseBalance(item.current_balance), item.iso_currency_code ?? "USD")}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    header: {
      paddingTop: spacing.sm,
      marginBottom: spacing.lg,
    },
    greeting: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    title: {
      fontSize: 22,
      fontWeight: "600",
      color: colors.text,
      letterSpacing: -0.3,
    },
    envBadge: {
      alignSelf: "flex-start",
      marginTop: spacing.sm,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.pill,
    },
    envBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primaryDark,
    },
    sandboxHint: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      lineHeight: 18,
    },
    gaugeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    gaugeCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    demoTag: {
      marginTop: spacing.xs,
      fontSize: 10,
      fontWeight: "600",
      color: colors.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    actions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingVertical: 13,
      alignItems: "center",
    },
    primaryPressed: {
      backgroundColor: colors.primaryDark,
    },
    primaryButtonText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 15,
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.background,
      borderRadius: radii.md,
      paddingVertical: 13,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    secondaryPressed: {
      backgroundColor: colors.primarySoft,
    },
    secondaryButtonText: {
      color: colors.primary,
      fontWeight: "600",
      fontSize: 15,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
    },
    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    accountRowLast: {
      borderBottomWidth: 0,
    },
    accountIcon: {
      width: 36,
      height: 36,
      borderRadius: radii.pill,
      backgroundColor: colors.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.md,
    },
    accountIconText: {
      color: colors.primaryDark,
      fontWeight: "600",
      fontSize: 14,
    },
    accountInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    accountName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "500",
    },
    accountMeta: {
      color: colors.textMuted,
      fontSize: 13,
      marginTop: 2,
    },
    accountBalance: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "600",
    },
    emptyList: {
      flexGrow: 1,
    },
    empty: {
      color: colors.textMuted,
      textAlign: "center",
      marginTop: spacing.xl,
      lineHeight: 22,
      fontSize: 14,
    },
    loader: {
      marginTop: spacing.lg,
    },
    errorBox: {
      backgroundColor: colors.errorBg,
      borderRadius: radii.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      lineHeight: 20,
    },
  });
