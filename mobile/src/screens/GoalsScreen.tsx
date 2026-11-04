import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { api, Account } from "../lib/api";
import {
  applyAutoTracking,
  createGoal,
  goalProgress,
  loadGoals,
  saveGoals,
  TRACKING_OPTIONS,
  trackingLabel,
  type Goal,
  type GoalTrackingMode,
} from "../lib/goals";
import { ThemeColors, radii, spacing } from "../theme/colors";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function parseAmount(value: string): number | null {
  const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

export function GoalsScreen() {
  const { session } = useAuth();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [starting, setStarting] = useState("");
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>("total_cash");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const userId = session?.user.id ?? "";
  const depositoryAccounts = accounts.filter((a) => a.is_active && a.type === "depository");

  const refreshGoals = useCallback(async () => {
    if (!userId) return;
    const stored = await loadGoals(userId);
    let fetchedAccounts: Account[] = [];
    try {
      fetchedAccounts = await api.getAccounts();
      setAccounts(fetchedAccounts);
    } catch {
      setAccounts([]);
    }
    const synced = applyAutoTracking(stored, fetchedAccounts);
    setGoals(synced);
    if (userId && synced.some((g, i) => g.currentAmount !== stored[i]?.currentAmount)) {
      await saveGoals(userId, synced);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refreshGoals().finally(() => setLoading(false));
  }, [userId, refreshGoals]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      void refreshGoals();
    }, [userId, refreshGoals])
  );

  const resetForm = () => {
    setTitle("");
    setTarget("");
    setStarting("");
    setTrackingMode("total_cash");
    setSelectedAccountId(null);
  };

  const handleAddGoal = async () => {
    const targetAmount = parseAmount(target);
    const startingAmount = parseAmount(starting) ?? 0;

    if (!title.trim()) {
      Alert.alert("Goal name required", "Give your goal a name, like Emergency fund.");
      return;
    }
    if (targetAmount === null || targetAmount <= 0) {
      Alert.alert("Invalid target", "Enter a target amount greater than zero.");
      return;
    }
    if (trackingMode === "account") {
      if (depositoryAccounts.length === 0) {
        Alert.alert(
          "No accounts linked",
          "Link a bank account on Home first, or choose a different tracking option."
        );
        return;
      }
      if (!selectedAccountId) {
        Alert.alert("Select an account", "Choose which account this goal should track.");
        return;
      }
    }

    let initialAmount = startingAmount;
    if (trackingMode === "total_cash") {
      initialAmount = depositoryAccounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0);
    } else if (trackingMode === "account" && selectedAccountId) {
      const account = depositoryAccounts.find((a) => a.id === selectedAccountId);
      initialAmount = account?.current_balance ?? 0;
    }

    const goal = createGoal(title, targetAmount, {
      trackingMode,
      accountId: trackingMode === "account" ? selectedAccountId ?? undefined : undefined,
      startingAmount: trackingMode === "manual" ? startingAmount : initialAmount,
    });

    const next = applyAutoTracking([...goals, goal], accounts);
    if (userId) await saveGoals(userId, next);
    setGoals(next);
    resetForm();
    setModalOpen(false);
  };

  const handleDelete = (goal: Goal) => {
    Alert.alert("Delete goal", `Remove "${goal.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = goals.filter((g) => g.id !== goal.id);
          setGoals(next);
          if (userId) await saveGoals(userId, next);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          Goals update automatically from your linked accounts, or stay fixed if you choose manual
          tracking.
        </Text>

        {loading ? (
          <Text style={styles.empty}>Loading goals…</Text>
        ) : goals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No goals yet</Text>
            <Text style={styles.empty}>
              Add a goal and pick how progress should be tracked.
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = goalProgress(goal);
            return (
              <Pressable
                key={goal.id}
                style={styles.card}
                onLongPress={() => handleDelete(goal)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{goal.title}</Text>
                  <Text style={styles.cardPercent}>{Math.round(progress)}%</Text>
                </View>

                <Text style={styles.trackingBadge}>{trackingLabel(goal, accounts)}</Text>

                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${progress}%` }]} />
                </View>

                <Text style={styles.amountText}>
                  {formatMoney(goal.currentAmount)} of {formatMoney(goal.targetAmount)}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setModalOpen(true)}
      >
        <Text style={styles.fabText}>+ Add goal</Text>
      </Pressable>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>New goal</Text>

              <Text style={styles.label}>Goal name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Vacation fund"
                placeholderTextColor={colors.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Target amount</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                value={target}
                onChangeText={setTarget}
              />

              <Text style={styles.sectionLabel}>How should progress update?</Text>
              {TRACKING_OPTIONS.map((option) => {
                const selected = trackingMode === option.mode;
                return (
                  <Pressable
                    key={option.mode}
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => setTrackingMode(option.mode)}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]} />
                    <View style={styles.optionText}>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                      <Text style={styles.optionDescription}>{option.description}</Text>
                    </View>
                  </Pressable>
                );
              })}

              {trackingMode === "account" && depositoryAccounts.length > 0 ? (
                <>
                  <Text style={styles.label}>Account</Text>
                  {depositoryAccounts.map((account) => {
                    const selected = selectedAccountId === account.id;
                    return (
                      <Pressable
                        key={account.id}
                        style={[styles.accountOption, selected && styles.optionSelected]}
                        onPress={() => setSelectedAccountId(account.id)}
                      >
                        <Text style={styles.accountName}>{account.name}</Text>
                        <Text style={styles.accountMeta}>
                          {formatMoney(account.current_balance ?? 0)}
                          {account.mask ? ` · ••••${account.mask}` : ""}
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : null}

              {trackingMode === "manual" ? (
                <>
                  <Text style={styles.label}>Starting amount</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                    value={starting}
                    onChangeText={setStarting}
                  />
                </>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => {
                    resetForm();
                    setModalOpen(false);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveBtn} onPress={handleAddGoal}>
                  <Text style={styles.saveText}>Save goal</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: 100,
    },
    lead: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    emptyCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.lg,
      backgroundColor: colors.surface,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: spacing.sm,
    },
    empty: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textMuted,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: colors.card,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
      marginRight: spacing.sm,
    },
    cardPercent: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
    },
    trackingBadge: {
      fontSize: 12,
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },
    track: {
      height: 8,
      backgroundColor: colors.surface,
      borderRadius: radii.pill,
      overflow: "hidden",
      marginBottom: spacing.sm,
    },
    fill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: radii.pill,
    },
    amountText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    fab: {
      position: "absolute",
      bottom: spacing.lg,
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
    },
    fabPressed: {
      backgroundColor: colors.primaryDark,
    },
    fabText: {
      color: colors.white,
      fontWeight: "600",
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalScroll: {
      flexGrow: 1,
      justifyContent: "flex-end",
    },
    modalCard: {
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.lg,
      borderTopRightRadius: radii.lg,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: spacing.md,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textSecondary,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    label: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: 4,
      marginTop: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    option: {
      flexDirection: "row",
      alignItems: "flex-start",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: radii.pill,
      borderWidth: 2,
      borderColor: colors.border,
      marginTop: 2,
    },
    radioSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    optionText: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    optionDescription: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
    },
    accountOption: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    accountName: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
    },
    accountMeta: {
      fontSize: 13,
      color: colors.textMuted,
      marginTop: 2,
    },
    modalActions: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 13,
      alignItems: "center",
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cancelText: {
      color: colors.textSecondary,
      fontWeight: "600",
    },
    saveBtn: {
      flex: 1,
      paddingVertical: 13,
      alignItems: "center",
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },
    saveText: {
      color: colors.white,
      fontWeight: "600",
    },
  });
